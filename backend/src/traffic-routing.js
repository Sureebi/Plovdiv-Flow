import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs'
import { loadEnvFile } from 'node:process'

const envPath = new URL('../.env', import.meta.url)
if (existsSync(envPath)) loadEnvFile(envPath)
const usagePath = new URL('../.traffic-usage.json', import.meta.url)
const key = process.env.TOMTOM_API_KEY
// A conservative local ceiling, shared by all users of this server.
const limit = Math.min(100, Math.max(0, Number(process.env.TOMTOM_DAILY_LIMIT ?? 100) || 0))
let blockedUntil = 0

function reserveRequest() {
  const day = new Date().toISOString().slice(0, 10)
  let usage = { day, count: 0 }
  if (existsSync(usagePath)) {
    const saved = JSON.parse(readFileSync(usagePath, 'utf8'))
    if (!Number.isInteger(saved.count) || saved.count < 0 || typeof saved.day !== 'string') throw new Error('Invalid usage counter')
    if (saved.day >= day) usage = saved
  }
  if (usage.count >= limit) return false
  usage.count++
  const temporary = new URL('../.traffic-usage.tmp', import.meta.url)
  writeFileSync(temporary, JSON.stringify(usage))
  renameSync(temporary, usagePath)
  return true
}

export async function trafficRoute({ origin, destination, waypoint }) {
  if (!key) return { reason: 'not-configured' }
  if (Date.now() < blockedUntil) return { reason: 'provider-unavailable' }
  try {
    if (!reserveRequest()) return { reason: 'daily-limit' }
    const locations = [origin, waypoint, destination].filter(Boolean)
      .map(([lng, lat]) => `${lat},${lng}`).join(':')
    const params = new URLSearchParams({
      key,
      traffic: 'true',
      departAt: 'now',
      routeType: 'fastest',
      travelMode: 'car',
      maxAlternatives: '2',
      computeTravelTimeFor: 'all'
    })
    const response = await fetch(`https://api.tomtom.com/routing/1/calculateRoute/${locations}/json?${params}`, { signal: AbortSignal.timeout(10000) })
    if (!response.ok) throw new Error('Traffic provider unavailable')
    const data = await response.json()
    if (!data.routes?.length) throw new Error('No route')
    const updatedAt = new Date().toISOString()
    const routes = data.routes.map((route) => {
      const coordinates = route.legs.flatMap((leg) => leg.points.map((point) => [point.longitude, point.latitude]))
      if (coordinates.length < 2 || !Number.isFinite(route.summary.travelTimeInSeconds)) throw new Error('Invalid route')
      const noTrafficTime = route.summary.noTrafficTravelTimeInSeconds
      const totalTrafficDelay = Number.isFinite(noTrafficTime)
        ? Math.max(0, route.summary.travelTimeInSeconds - noTrafficTime)
        : route.summary.trafficDelayInSeconds ?? null
      return {
        distanceInMeters: route.summary.lengthInMeters,
        durationInMinutes: Math.max(1, Math.round(route.summary.travelTimeInSeconds / 60)),
        trafficDelayInSeconds: totalTrafficDelay,
        traffic: {
          status: 'live',
          updatedAt,
          noTrafficTravelTimeInSeconds: route.summary.noTrafficTravelTimeInSeconds ?? null,
          historicTrafficTravelTimeInSeconds: route.summary.historicTrafficTravelTimeInSeconds ?? null,
          liveTrafficTravelTimeInSeconds: route.summary.liveTrafficIncidentsTravelTimeInSeconds ?? null,
          trafficLengthInMeters: route.summary.trafficLengthInMeters ?? null,
          incidentDelayInSeconds: route.summary.trafficDelayInSeconds ?? null
        },
        source: 'tomtom',
        geometry: { type: 'Feature', properties: { travelModeId: 'car', hasWaypoint: Boolean(waypoint), source: 'tomtom' }, geometry: { type: 'LineString', coordinates } }
      }
    }).sort((a, b) => a.durationInMinutes - b.durationInMinutes)
    return { route: { ...routes[0], alternatives: routes.slice(1), alternativesCount: routes.length - 1 } }
  } catch {
    // Never log provider URLs, since they contain the key and coordinates.
    blockedUntil = Date.now() + 60000
    return { reason: 'provider-unavailable' }
  }
}
