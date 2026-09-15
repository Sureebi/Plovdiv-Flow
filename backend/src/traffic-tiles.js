import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { loadEnvFile } from 'node:process'

const envPath = new URL('../.env', import.meta.url)
if (existsSync(envPath)) loadEnvFile(envPath)

const apiKey = process.env.TOMTOM_API_KEY
const monthlyLimit = Math.min(5000, Math.max(0, Number(process.env.TOMTOM_TILE_MONTHLY_LIMIT ?? 5000) || 0))
const usagePath = new URL('../.traffic-tile-usage.json', import.meta.url)
const cache = new Map()
const cacheLifetimeMs = 5 * 60_000
const pendingRequests = new Map()

function reserveTileRequest() {
  const month = new Date().toISOString().slice(0, 7)
  let usage = { month, count: 0 }

  if (existsSync(usagePath)) {
    const saved = JSON.parse(readFileSync(usagePath, 'utf8'))
    if (saved.month === month && Number.isInteger(saved.count) && saved.count >= 0) usage = saved
  }

  if (usage.count >= monthlyLimit) return false
  usage.count++
  const temporaryPath = new URL('../.traffic-tile-usage.tmp', import.meta.url)
  writeFileSync(temporaryPath, JSON.stringify(usage))
  renameSync(temporaryPath, usagePath)
  return true
}

export async function getTrafficTile({ zoom, x, y }) {
  if (!apiKey) return { status: 503, reason: 'not-configured' }

  const cacheKey = `${zoom}/${x}/${y}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.createdAt < cacheLifetimeMs) {
    return { status: 200, body: cached.body, cache: 'HIT' }
  }
  if (pendingRequests.has(cacheKey)) return pendingRequests.get(cacheKey)
  if (!reserveTileRequest()) return { status: 200, body: Buffer.alloc(0), cache: 'LIMIT' }

  const request = (async () => {
    const params = new URLSearchParams({ key: apiKey, tileSize: '256' })
    const response = await fetch(
      `https://api.tomtom.com/traffic/map/4/tile/flow/relative-delay/${zoom}/${x}/${y}.pbf?${params}&trafficLevelStep=0.05`,
      { signal: AbortSignal.timeout(10_000) }
    )
    if (!response.ok) return { status: 200, body: Buffer.alloc(0), cache: 'ERROR' }

    const body = Buffer.from(await response.arrayBuffer())
    cache.set(cacheKey, { body, createdAt: Date.now() })
    if (cache.size > 300) cache.delete(cache.keys().next().value)
    return { status: 200, body, cache: 'MISS' }
  })()

  pendingRequests.set(cacheKey, request)
  try {
    return await request
  } finally {
    pendingRequests.delete(cacheKey)
  }
}
