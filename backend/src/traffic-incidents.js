import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { loadEnvFile } from 'node:process'

const envPath = new URL('../.env', import.meta.url)
if (existsSync(envPath)) loadEnvFile(envPath)

const apiKey = process.env.TOMTOM_API_KEY
const monthlyLimit = Math.min(2000, Math.max(0, Number(process.env.TOMTOM_INCIDENT_MONTHLY_LIMIT ?? 2000) || 0))
const usagePath = new URL('../.traffic-incident-usage.json', import.meta.url)
const cache = new Map()

function representativePoint(geometry) {
  if (geometry.type === 'Point') return geometry
  const coordinates = []
  const collect = (value) => {
    if (Array.isArray(value) && value.length >= 2 && value.every(Number.isFinite)) coordinates.push(value)
    else if (Array.isArray(value)) value.forEach(collect)
  }
  collect(geometry.coordinates)
  return coordinates.length
    ? { type: 'Point', coordinates: coordinates[Math.floor(coordinates.length / 2)] }
    : null
}

function reserveRequest() {
  const month = new Date().toISOString().slice(0, 7)
  let usage = { month, count: 0 }
  if (existsSync(usagePath)) {
    const saved = JSON.parse(readFileSync(usagePath, 'utf8'))
    if (saved.month === month && Number.isInteger(saved.count) && saved.count >= 0) usage = saved
  }
  if (usage.count >= monthlyLimit) return false
  usage.count++
  const temporaryPath = new URL('../.traffic-incident-usage.tmp', import.meta.url)
  writeFileSync(temporaryPath, JSON.stringify(usage))
  renameSync(temporaryPath, usagePath)
  return true
}

export async function getTrafficIncidents(bbox) {
  if (!apiKey) return { status: 503, reason: 'not-configured' }

  const cacheKey = bbox.map((value) => value.toFixed(3)).join(',')
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.createdAt < 60_000) return { status: 200, data: cached.data }
  if (!reserveRequest()) return { status: 429, reason: 'monthly-limit' }

  const params = new URLSearchParams({
    key: apiKey,
    bbox: bbox.join(','),
    language: 'en-GB',
    timeValidityFilter: 'present',
    fields: '{incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description}}}}'
  })
  const response = await fetch(`https://api.tomtom.com/traffic/services/5/incidentDetails?${params}`, {
    signal: AbortSignal.timeout(10_000)
  })
  if (!response.ok) return { status: 502, reason: 'provider-unavailable' }

  const payload = await response.json()
  const data = {
    type: 'FeatureCollection',
    features: (payload.incidents ?? []).map((incident) => {
      const iconCategory = Number(incident.properties?.iconCategory)
      return {
        type: 'Feature',
        geometry: iconCategory === 6 ? incident.geometry : representativePoint(incident.geometry),
        properties: {
        iconCategory,
        magnitudeOfDelay: Number(incident.properties?.magnitudeOfDelay ?? 0),
        description: incident.properties?.events?.[0]?.description ?? 'Traffic incident'
      }
      }
    }).filter((incident) => incident.geometry)
  }
  cache.set(cacheKey, { data, createdAt: Date.now() })
  if (cache.size > 50) cache.delete(cache.keys().next().value)
  return { status: 200, data }
}
