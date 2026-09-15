function parseCoordinates(value) {
  if (!value) return null

  const [lng, lat] = value.split(',').map(Number)

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null
  }

  return [lng, lat]
}

function destinationCoordinates(envKey, fallback) {
  return parseCoordinates(import.meta.env[envKey]) ?? fallback
}

export const savedDestinations = [
  {
    id: 'home',
    name: 'Home',
    icon: '🏠',
    description: 'Sample home area',
    coordinates: destinationCoordinates('VITE_DESTINATION_HOME', [
      24.7359,
      42.1419
    ])
  },
  {
    id: 'work',
    name: 'Work',
    icon: '💼',
    description: 'Sample work area',
    coordinates: destinationCoordinates('VITE_DESTINATION_WORK', [
      24.7701,
      42.1296
    ])
  },
  {
    id: 'center',
    name: 'Center',
    icon: '⭐',
    description: 'Plovdiv center',
    coordinates: destinationCoordinates('VITE_DESTINATION_CENTER', [
      24.7453,
      42.1354
    ])
  }
]
