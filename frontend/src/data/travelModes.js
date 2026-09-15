export const travelModes = [
  {
    id: 'car',
    label: 'Car',
    icon: '🚗',
    routingProfile: 'car',
    routeType: 'fastest',
    averageSpeedKph: 28,
    routeColor: '#2563eb'
  },
  {
    id: 'bike',
    label: 'Bike',
    icon: '🚲',
    routingProfile: 'bicycle',
    routeType: 'shortest',
    averageSpeedKph: 16,
    routeColor: '#059669'
  },
  {
    id: 'walk',
    label: 'Walk',
    icon: '🚶',
    routingProfile: 'pedestrian',
    routeType: 'shortest',
    averageSpeedKph: 5,
    routeColor: '#7c3aed'
  }
]

export const defaultTravelMode = travelModes[0]
