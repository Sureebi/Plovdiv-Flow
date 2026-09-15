const toRadians = (degrees) => degrees * (Math.PI / 180)

function getDistanceInMeters(origin, destination) {
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

function createFallbackRoute(origin, destination, travelMode, waypoint) {
  const routeCoordinates = waypoint
    ? [origin, waypoint, destination.coordinates]
    : [origin, destination.coordinates]
  const distanceInMeters =
    getDistanceInMeters(origin, waypoint ?? destination.coordinates) +
    (waypoint ? getDistanceInMeters(waypoint, destination.coordinates) : 0)
  const averageSpeedKph = travelMode?.averageSpeedKph ?? 28
  const durationInMinutes = Math.max(
    1,
    Math.round((distanceInMeters / 1000 / averageSpeedKph) * 60)
  )

  return {
    destination,
    travelMode,
    distanceInMeters,
    durationInMinutes,
    trafficDelayInSeconds: null,
    source: 'fallback',
    geometry: {
      type: 'Feature',
      properties: {
        destinationId: destination.id,
        travelModeId: travelMode?.id,
        hasWaypoint: Boolean(waypoint),
        source: 'fallback'
      },
      geometry: {
        type: 'LineString',
        coordinates: routeCoordinates
      }
    }
  }
}

export async function calculateRoute(origin, destination, travelMode, waypoint = null) {
  if (!origin || !destination) {
    throw new Error('Route origin and destination are required.')
  }

  try {
    const params = new URLSearchParams({
      origin: origin.join(','),
      destination: destination.coordinates.join(','),
      mode: travelMode?.id ?? 'car'
    })

    if (waypoint) {
      params.set('waypoint', waypoint.join(','))
    }

    const response = await fetch(`/api/routes?${params}`)

    if (!response.ok) {
      throw new Error(`Backend route request failed with ${response.status}.`)
    }

    const route = await response.json()

    return {
      ...route,
      trafficDelayInSeconds: route.traffic?.status === 'live' ? route.trafficDelayInSeconds : null,
      destination,
      travelMode
    }
  } catch (error) {
    console.warn('Routing provider unavailable. Using fallback route.', error)
    return createFallbackRoute(origin, destination, travelMode, waypoint)
  }
}
