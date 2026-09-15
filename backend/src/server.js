import http from 'node:http'
import { trafficRoute } from './traffic-routing.js'
import { getTrafficTile } from './traffic-tiles.js'
import { getTrafficIncidents } from './traffic-incidents.js'

const port = Number(process.env.PORT ?? 8787)
const osrmBaseUrl =
  process.env.OSRM_BASE_URL ?? 'https://router.project-osrm.org'
const valhallaBaseUrl =
  process.env.VALHALLA_BASE_URL ?? 'https://valhalla1.openstreetmap.de'

const modeProfiles = {
  car: 'driving',
  bike: 'cycling',
  walk: 'walking'
}

const valhallaCostings = {
  bike: 'bicycle',
  walk: 'pedestrian'
}

const modeSpeedsKph = {
  car: 28,
  bike: 16,
  walk: 5
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  })
  response.end(JSON.stringify(payload))
}

async function handleTrafficTileRequest(request, response) {
  const match = request.url.match(/^\/api\/traffic\/tiles\/(\d+)\/(\d+)\/(\d+)\.pbf(?:\?.*)?$/)
  if (!match) return sendJson(response, 400, { error: 'Invalid traffic tile coordinates.' })

  const [zoom, x, y] = match.slice(1).map(Number)
  const tileCount = 2 ** zoom
  if (zoom > 22 || x >= tileCount || y >= tileCount) {
    return sendJson(response, 400, { error: 'Traffic tile is outside the valid range.' })
  }

  try {
    const tile = await getTrafficTile({ zoom, x, y })
    if (tile.status !== 200) return sendJson(response, tile.status, { error: tile.reason })
    response.writeHead(200, {
      'Content-Type': 'application/x-protobuf',
      'Cache-Control': 'public, max-age=300',
      'X-Tile-Cache': tile.cache
    })
    response.end(tile.body)
  } catch {
    sendJson(response, 502, { error: 'provider-unavailable' })
  }
}

async function handleTrafficIncidentRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`)
  const bbox = (url.searchParams.get('bbox') ?? '').split(',').map(Number)
  if (bbox.length !== 4 || bbox.some((value) => !Number.isFinite(value))) {
    return sendJson(response, 400, { error: 'Invalid bounding box.' })
  }
  const [west, south, east, north] = bbox
  if (west >= east || south >= north || east - west > 2 || north - south > 2) {
    return sendJson(response, 400, { error: 'Bounding box is outside the valid range.' })
  }

  try {
    const incidents = await getTrafficIncidents(bbox)
    if (incidents.status !== 200) return sendJson(response, incidents.status, { error: incidents.reason })
    sendJson(response, 200, incidents.data)
  } catch {
    sendJson(response, 502, { error: 'provider-unavailable' })
  }
}

function getDistanceInMeters(origin, destination) {
  const toRadians = (degrees) => degrees * (Math.PI / 180)
  const earthRadiusInMeters = 6371000
  const [originLng, originLat] = origin
  const [destinationLng, destinationLat] = destination
  const deltaLat = toRadians(destinationLat - originLat)
  const deltaLng = toRadians(destinationLng - originLng)
  const originLatRad = toRadians(originLat)
  const destinationLatRad = toRadians(destinationLat)
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(originLatRad) *
      Math.cos(destinationLatRad) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2)

  return earthRadiusInMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function parseCoordinate(value) {
  const [lng, lat] = value.split(',').map(Number)

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null
  }

  return [lng, lat]
}

function decodePolyline(shape, precision = 6) {
  const coordinates = []
  const factor = 10 ** precision
  let index = 0
  let lat = 0
  let lng = 0

  while (index < shape.length) {
    let result = 0
    let shift = 0
    let byte

    do {
      byte = shape.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    lat += result & 1 ? ~(result >> 1) : result >> 1
    result = 0
    shift = 0

    do {
      byte = shape.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    lng += result & 1 ? ~(result >> 1) : result >> 1
    coordinates.push([lng / factor, lat / factor])
  }

  return coordinates
}

function fallbackRoute({ origin, destination, waypoint, mode }) {
  const coordinates = waypoint ? [origin, waypoint, destination] : [origin, destination]
  const distanceInMeters =
    getDistanceInMeters(origin, waypoint ?? destination) +
    (waypoint ? getDistanceInMeters(waypoint, destination) : 0)
  const speedKph = modeSpeedsKph[mode] ?? modeSpeedsKph.car

  return {
    distanceInMeters,
    durationInMinutes: Math.max(
      1,
      Math.round((distanceInMeters / 1000 / speedKph) * 60)
    ),
    trafficDelayInSeconds: null,
    source: 'backend-fallback',
    alternatives: [],
    alternativesCount: 0,
    geometry: {
      type: 'Feature',
      properties: {
        travelModeId: mode,
        hasWaypoint: Boolean(waypoint),
        source: 'backend-fallback'
      },
      geometry: {
        type: 'LineString',
        coordinates
      }
    }
  }
}

function osrmRouteToResult(route, mode, waypoint) {
  return {
    distanceInMeters: route.distance,
    durationInMinutes: Math.max(1, Math.round(route.duration / 60)),
    trafficDelayInSeconds: null,
    source: 'osrm',
    geometry: {
      type: 'Feature',
      properties: {
        travelModeId: mode,
        hasWaypoint: Boolean(waypoint),
        source: 'osrm'
      },
      geometry: route.geometry
    }
  }
}

async function calculateOsrmRoute({ origin, destination, waypoint, mode }) {
  if (!osrmBaseUrl) {
    throw new Error('OSRM_BASE_URL is not configured.')
  }

  const profile = modeProfiles[mode] ?? modeProfiles.car
  const coordinates = [origin, waypoint, destination]
    .filter(Boolean)
    .map((coordinate) => coordinate.join(','))
    .join(';')
  const url = `${osrmBaseUrl}/route/v1/${profile}/${coordinates}?overview=full&geometries=geojson&alternatives=true&steps=false`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`OSRM failed with ${response.status}.`)
  }

  const data = await response.json()
  const [route, ...alternatives] = data.routes ?? []

  if (!route?.geometry) {
    throw new Error('OSRM returned no route.')
  }

  return {
    ...osrmRouteToResult(route, mode, waypoint),
    alternatives: alternatives.map((alternative) =>
      osrmRouteToResult(alternative, mode, waypoint)
    ),
    alternativesCount: alternatives.length
  }
}

function valhallaRouteToResult(trip, mode, waypoint) {
  const coordinates = trip.legs.flatMap((leg) => decodePolyline(leg.shape))

  if (!coordinates.length) {
    throw new Error('Valhalla returned no route shape.')
  }

  return {
    distanceInMeters: trip.summary.length * 1000,
    durationInMinutes: Math.max(1, Math.round(trip.summary.time / 60)),
    trafficDelayInSeconds: null,
    source: 'valhalla',
    alternatives: [],
    alternativesCount: 0,
    geometry: {
      type: 'Feature',
      properties: {
        travelModeId: mode,
        hasWaypoint: Boolean(waypoint),
        source: 'valhalla'
      },
      geometry: {
        type: 'LineString',
        coordinates
      }
    }
  }
}

async function calculateValhallaRoute({ origin, destination, waypoint, mode }) {
  const costing = valhallaCostings[mode]

  if (!costing) {
    throw new Error(`Valhalla is not configured for mode "${mode}".`)
  }

  const body = {
    locations: [origin, waypoint, destination]
      .filter(Boolean)
      .map(([lon, lat]) => ({ lat, lon })),
    costing,
    directions_options: {
      units: 'kilometers'
    }
  }

  const response = await fetch(`${valhallaBaseUrl}/route`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    throw new Error(`Valhalla failed with ${response.status}.`)
  }

  const data = await response.json()

  if (!data.trip?.legs?.length || !data.trip?.summary) {
    throw new Error('Valhalla returned no route.')
  }

  return valhallaRouteToResult(data.trip, mode, waypoint)
}

async function calculateRoute({ origin, destination, waypoint, mode }) {
  if (mode === 'bike' || mode === 'walk') {
    return calculateValhallaRoute({ origin, destination, waypoint, mode })
  }

  const traffic = await trafficRoute({ origin, destination, waypoint })
  if (traffic.route) return traffic.route
  const route = await calculateOsrmRoute({ origin, destination, waypoint, mode })
  return { ...route, traffic: { status: 'unavailable', reason: traffic.reason } }
}

async function handleRouteRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`)
  const origin = parseCoordinate(url.searchParams.get('origin') ?? '')
  const destination = parseCoordinate(url.searchParams.get('destination') ?? '')
  const waypointValue = url.searchParams.get('waypoint')
  const waypoint = waypointValue ? parseCoordinate(waypointValue) : null
  const mode = url.searchParams.get('mode') ?? 'car'

  if (!origin || !destination || (waypointValue && !waypoint)) {
    sendJson(response, 400, { error: 'Invalid route coordinates.' })
    return
  }

  try {
    const route = await calculateRoute({ origin, destination, waypoint, mode })
    sendJson(response, 200, route)
  } catch (error) {
    console.warn('Route engine unavailable. Using fallback route.', error)
    sendJson(response, 200, fallbackRoute({ origin, destination, waypoint, mode }))
  }
}

const server = http.createServer((request, response) => {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {})
    return
  }

  if (request.method === 'GET' && request.url.startsWith('/api/routes')) {
    handleRouteRequest(request, response)
    return
  }


  if (request.method === 'GET' && request.url.startsWith('/api/traffic/tiles/')) {
    handleTrafficTileRequest(request, response)
    return
  }


  if (request.method === 'GET' && request.url.startsWith('/api/traffic/incidents')) {
    handleTrafficIncidentRequest(request, response)
    return
  }

  sendJson(response, 404, { error: 'Not found.' })
})

server.listen(port, () => {
  console.log(`Plovdiv Flow backend listening on http://localhost:${port}`)
})
