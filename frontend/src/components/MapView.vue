<script setup>
import { onMounted, onBeforeUnmount, watch } from 'vue'
import {
  Map,
  NavigationControl,
  Marker,
  Popup,
  LngLatBounds,
  setWorkerUrl
} from 'maplibre-gl'

import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { calculateRoute } from '../services/routing'

setWorkerUrl(workerUrl)

const props = defineProps({
  waypoint: { type: Array, default: null },
  selectingWaypoint: { type: Boolean, default: false },
  showTraffic: { type: Boolean, default: true },
  showIncidents: { type: Boolean, default: true },
  showRoadworks: { type: Boolean, default: true },
  selectingLocation: { type: Boolean, default: false },
  savedLocations: { type: Array, required: true },
  destination: {
    type: Object,
    default: null
  },
  travelMode: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['route-calculated', 'location-status-change', 'waypoint-selected', 'cancel-waypoint', 'saved-location-selected', 'saved-location-open', 'cancel-location'])

let map
let userMarker
let destinationMarker
let waypointMarker
let savedLocationMarkers = []
let currentPosition = null
let mapLoaded = false
let routeRequestId = 0
let incidentRequestId = 0
let locationStatus = 'pending'
let locationMessage = 'Finding current location...'

const routeSourceId = 'quick-travel-route'
const routeLayerId = 'quick-travel-route-line'
const routeCasingLayerId = 'quick-travel-route-casing'
const alternativeRoutesSourceId = 'quick-travel-alternatives'
const alternativeRoutesLayerId = 'quick-travel-alternatives-line'
const fallbackPosition = [24.7453, 42.1354]
const trafficSourceId = 'live-traffic-flow'
const trafficLayerIds = [
  'live-traffic-slow',
  'live-traffic-heavy',
  'live-traffic-closed'
]
const incidentsSourceId = 'live-traffic-incidents'
const incidentLayerIds = [
  'traffic-jams-slow',
  'traffic-jams-heavy',
  'traffic-incidents-points',
  'traffic-incidents-labels',
  'traffic-roadworks-points',
  'traffic-roadworks-labels'
]

function ensureTrafficLayer() {
  if (!map || map.getSource(trafficSourceId)) return

  map.addSource(trafficSourceId, {
    type: 'vector',
    tiles: ['/api/traffic/tiles/{z}/{x}/{y}.pbf'],
    minzoom: 5,
    maxzoom: 22
  })

  const layers = [
    ['live-traffic-slow', ['all', ['!=', ['get', 'road_closure'], true], ['>=', ['get', 'traffic_level'], 0.35], ['<', ['get', 'traffic_level'], 0.75]], '#facc15', 5],
    ['live-traffic-heavy', ['all', ['!=', ['get', 'road_closure'], true], ['<', ['get', 'traffic_level'], 0.35]], '#e70704', 6],
    ['live-traffic-closed', ['==', ['get', 'road_closure'], true], '#777777', 7]
  ]

  layers.forEach(([id, filter, color, width]) => {
    map.addLayer({
      id,
      type: 'line',
      source: trafficSourceId,
      'source-layer': 'Traffic flow',
      filter,
      layout: {
        visibility: props.showTraffic ? 'visible' : 'none',
        'line-cap': 'round',
        'line-join': 'round'
      },
      paint: {
        'line-color': color,
        'line-width': ['interpolate', ['linear'], ['zoom'], 9, 2, 14, width],
        'line-opacity': 0.9
      }
    })
  })
}

function ensureIncidentLayers() {
  if (!map || map.getSource(incidentsSourceId)) return

  map.addSource(incidentsSourceId, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  })

  map.addLayer({
    id: 'traffic-jams-slow',
    type: 'line',
    source: incidentsSourceId,
    filter: ['all', ['==', ['get', 'iconCategory'], 6], ['<', ['get', 'magnitudeOfDelay'], 3]],
    layout: { visibility: props.showTraffic ? 'visible' : 'none', 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#facc15', 'line-width': 6, 'line-opacity': 0.95 }
  })
  map.addLayer({
    id: 'traffic-jams-heavy',
    type: 'line',
    source: incidentsSourceId,
    filter: ['all', ['==', ['get', 'iconCategory'], 6], ['>=', ['get', 'magnitudeOfDelay'], 3]],
    layout: { visibility: props.showTraffic ? 'visible' : 'none', 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#e70704', 'line-width': 7, 'line-opacity': 0.95 }
  })

  const definitions = [
    ['traffic-incidents-points', 'circle', ['all', ['!=', ['get', 'iconCategory'], 9], ['!=', ['get', 'iconCategory'], 6]], '#7c3aed'],
    ['traffic-roadworks-points', 'circle', ['==', ['get', 'iconCategory'], 9], '#f59e0b']
  ]

  definitions.forEach(([id, type, categoryFilter, color]) => {
    map.addLayer({
      id,
      type,
      source: incidentsSourceId,
      filter: ['all', categoryFilter, ['==', ['geometry-type'], 'Point']],
      layout: { visibility: 'visible' },
      paint: { 'circle-color': color, 'circle-radius': 7, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 }
    })
  })

  const labels = [
    ['traffic-incidents-labels', ['all', ['!=', ['get', 'iconCategory'], 9], ['!=', ['get', 'iconCategory'], 6]], '!', '#ffffff'],
    ['traffic-roadworks-labels', ['==', ['get', 'iconCategory'], 9], 'R', '#111827']
  ]
  labels.forEach(([id, categoryFilter, label, color]) => {
    map.addLayer({
      id,
      type: 'symbol',
      source: incidentsSourceId,
      filter: ['all', categoryFilter, ['==', ['geometry-type'], 'Point']],
      layout: {
        visibility: 'visible',
        'text-field': label,
        'text-size': 11,
        'text-font': ['Noto Sans Bold']
      },
      paint: { 'text-color': color }
    })
  })
  updateIncidentVisibility()
}

function updateIncidentVisibility() {
  if (!mapLoaded || !map.getSource(incidentsSourceId)) return
  incidentLayerIds.forEach((id) => {
    const isRoadwork = id.includes('roadworks')
    const isJam = id.includes('jams')
    const visible = isRoadwork ? props.showRoadworks : isJam ? props.showTraffic : props.showIncidents
    map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none')
  })
}

async function refreshIncidents() {
  if (!mapLoaded || (!props.showTraffic && !props.showIncidents && !props.showRoadworks)) return
  const requestId = ++incidentRequestId
  const bounds = map.getBounds()
  const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]

  try {
    const response = await fetch(`/api/traffic/incidents?bbox=${bbox.join(',')}`)
    if (!response.ok) return
    const data = await response.json()
    if (requestId !== incidentRequestId || !mapLoaded) return
    map.getSource(incidentsSourceId)?.setData(data)
  } catch (error) {
    console.warn('Traffic incidents unavailable.', error)
  }
}

function emitLocationStatus() {
  emit('location-status-change', {
    status: locationStatus,
    message: locationMessage
  })
}

function ensureRouteLayer() {
  if (!map || map.getSource(routeSourceId)) return

  map.addSource(alternativeRoutesSourceId, {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: []
    }
  })

  map.addLayer({
    id: alternativeRoutesLayerId,
    type: 'line',
    source: alternativeRoutesSourceId,
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': '#60a5fa',
      'line-width': 4,
      'line-opacity': 0.45
    }
  })

  map.addSource(routeSourceId, {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: []
    }
  })

  map.addLayer({
    id: routeCasingLayerId,
    type: 'line',
    source: routeSourceId,
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': '#ffffff',
      'line-width': 9,
      'line-opacity': 0.9
    }
  })

  map.addLayer({
    id: routeLayerId,
    type: 'line',
    source: routeSourceId,
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': '#2563eb',
      'line-width': 5,
      'line-opacity': 1
    }
  })
}

function setWaypointMarker(coordinates) {
  if (waypointMarker) waypointMarker.remove()

  if (!coordinates) return

  const markerElement = document.createElement('div')
  markerElement.className = 'waypoint-marker'
  markerElement.textContent = '↕'

  waypointMarker = new Marker({ element: markerElement })
    .setLngLat(coordinates)
    .setPopup(new Popup({ offset: 18 }).setText('Route via this point'))
    .addTo(map)
}

function syncSavedLocationMarkers() {
  savedLocationMarkers.forEach((marker) => marker.remove())
  savedLocationMarkers = []
  if (!mapLoaded) return

  props.savedLocations
    .filter((place) => place.id !== props.destination?.id)
    .forEach((place) => {
      const markerElement = document.createElement('button')
      markerElement.className = 'saved-location-marker'
      markerElement.type = 'button'
      markerElement.title = place.name
      markerElement.textContent = place.icon
      markerElement.addEventListener('click', (event) => {
        event.stopPropagation()
        emit('saved-location-open', place)
      })
      savedLocationMarkers.push(
        new Marker({ element: markerElement }).setLngLat(place.coordinates).addTo(map)
      )
    })
}

function setCurrentPosition(coordinates, { isFallback = false } = {}) {
  currentPosition = coordinates
  locationStatus = isFallback ? 'fallback' : 'ready'
  locationMessage = isFallback
    ? 'Using sample Plovdiv location'
    : 'Using current location'
  emitLocationStatus()

  if (userMarker) userMarker.remove()

  const markerElement = document.createElement('div')
  markerElement.className = isFallback
    ? 'fallback-location-marker'
    : 'user-location-marker'

  userMarker = new Marker({ element: markerElement })
    .setLngLat(coordinates)
    .setPopup(
      new Popup({ offset: 20 }).setText(
        isFallback ? 'Sample location' : 'You are here'
      )
    )
    .addTo(map)

  map.flyTo({
    center: coordinates,
    zoom: 15
  })

  if (props.destination) {
    drawRouteToDestination(props.destination, props.travelMode)
  }
}

async function drawRouteToDestination(destination, travelMode) {
  const requestId = ++routeRequestId
  if (!map || !mapLoaded || !currentPosition || !destination) return

  ensureRouteLayer()

  const route = await calculateRoute(
    currentPosition,
    destination,
    travelMode,
    props.waypoint
  )
  if (requestId !== routeRequestId || !mapLoaded) return
  const source = map.getSource(routeSourceId)
  const alternativeSource = map.getSource(alternativeRoutesSourceId)
  source.setData(route.geometry)
  alternativeSource.setData({
    type: 'FeatureCollection',
    features: route.alternatives?.map((alternative) => alternative.geometry) ?? []
  })
  map.setPaintProperty(routeLayerId, 'line-color', travelMode.routeColor)

  if (destinationMarker) destinationMarker.remove()

  const markerElement = document.createElement('div')
  markerElement.className = 'destination-marker'
  markerElement.textContent = destination.icon

  destinationMarker = new Marker({ element: markerElement })
    .setLngLat(destination.coordinates)
    .setPopup(
      new Popup({ offset: 22 }).setText(
        `${destination.name} • ${travelMode.label} • ${route.durationInMinutes} min`
      )
    )
    .addTo(map)

  const bounds = route.geometry.geometry.coordinates.reduce(
    (mapBounds, coordinate) => mapBounds.extend(coordinate),
    new LngLatBounds(
      route.geometry.geometry.coordinates[0],
      route.geometry.geometry.coordinates[0]
    )
  )

  map.fitBounds(bounds, {
    padding: {
      top: 90,
      bottom: 90,
      left: 380,
      right: 360
    },
    maxZoom: 15
  })

  emit('route-calculated', route)
}

onMounted(() => {
  emitLocationStatus()

  map = new Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [24.7453, 42.1354],
    zoom: 13.5
  })

  map.addControl(new NavigationControl(), 'top-right')
  map.on('load', () => {
    mapLoaded = true
    ensureTrafficLayer()
    ensureIncidentLayers()
    refreshIncidents()
    syncSavedLocationMarkers()
    if (props.destination) {
      drawRouteToDestination(props.destination, props.travelMode)
    }
  })

  map.on('moveend', refreshIncidents)

  incidentLayerIds.forEach((layerId) => {
    map.on('click', layerId, (event) => {
      const feature = event.features?.[0]
      if (!feature) return
      const coordinates = feature.geometry.type === 'Point'
        ? feature.geometry.coordinates
        : event.lngLat.toArray()
      new Popup({ offset: 10 })
        .setLngLat(coordinates)
        .setText(feature.properties.description ?? 'Traffic incident')
        .addTo(map)
    })
    map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = props.selectingWaypoint ? 'crosshair' : '' })
  })

  map.on('click', (event) => {
    if (props.selectingLocation) {
      emit('saved-location-selected', [event.lngLat.lng, event.lngLat.lat])
      return
    }
    if (!props.selectingWaypoint || !props.destination || !currentPosition) return
    if (event.originalEvent.target.closest('.maplibregl-marker, .maplibregl-popup')) return

    emit('waypoint-selected', [event.lngLat.lng, event.lngLat.lat])
  })

  if (!('geolocation' in navigator)) {
    console.warn('Geolocation is not supported in this browser.')
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lng = position.coords.longitude
      const lat = position.coords.latitude

      console.log('User location:', { lat, lng })
      setCurrentPosition([lng, lat])
    },
    (error) => {
      console.warn('Location unavailable:', error)
      locationStatus = 'fallback'
      locationMessage = `Location unavailable: ${error.message}`
      emitLocationStatus()
      setCurrentPosition(fallbackPosition, { isFallback: true })
    },
    {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 60000
    }
  )
})

watch(
  () => props.destination,
  (destination) => {
    syncSavedLocationMarkers()
    drawRouteToDestination(destination, props.travelMode)
  }
)

watch(
  () => props.travelMode,
  (travelMode) => {
    const destination = props.destination
    drawRouteToDestination(destination, travelMode)
  }
)

watch(() => props.waypoint, (coordinates) => {
  setWaypointMarker(coordinates)
  drawRouteToDestination(props.destination, props.travelMode)
})

watch(() => props.selectingWaypoint, (selecting) => {
  if (map) map.getCanvas().style.cursor = selecting || props.selectingLocation ? 'crosshair' : ''
})

watch(() => props.selectingLocation, (selecting) => {
  if (map) map.getCanvas().style.cursor = selecting || props.selectingWaypoint ? 'crosshair' : ''
})

watch(() => props.savedLocations, syncSavedLocationMarkers, { deep: true })

watch(() => props.showTraffic, (visible) => {
  if (!mapLoaded) return
  ensureTrafficLayer()
  trafficLayerIds.forEach((id) => {
    map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none')
  })
  updateIncidentVisibility()
  if (visible) refreshIncidents()
})

watch([() => props.showIncidents, () => props.showRoadworks], () => {
  if (!mapLoaded) return
  ensureIncidentLayers()
  updateIncidentVisibility()
  refreshIncidents()
})

function handleKeydown(event) {
  if (event.key === 'Escape' && props.selectingWaypoint) emit('cancel-waypoint')
  if (event.key === 'Escape' && props.selectingLocation) emit('cancel-location')
}

onMounted(() => window.addEventListener('keydown', handleKeydown))

onBeforeUnmount(() => {
  mapLoaded = false
  routeRequestId++
  incidentRequestId++
  window.removeEventListener('keydown', handleKeydown)
  if (waypointMarker) waypointMarker.remove()
  savedLocationMarkers.forEach((marker) => marker.remove())
  if (destinationMarker) destinationMarker.remove()
  if (userMarker) userMarker.remove()
  if (map) map.remove()
})
</script>

<template>
  <div id="map"></div>
</template>

<style scoped>
#map {
  width: 100%;
  height: 100%;
}

:global(.user-location-marker),
:global(.fallback-location-marker) {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #2563eb;
  border: 3px solid white;
  box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.25);
}

:global(.fallback-location-marker) {
  background: #f59e0b;
  box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.25);
}

:global(.destination-marker) {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid #2563eb;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);
  font-size: 18px;
}

:global(.waypoint-marker) {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #111827;
  border: 2px solid #ffffff;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.22);
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
}

:global(.saved-location-marker) {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  padding: 0;
  border-radius: 50%;
  border: 2px solid #ffffff;
  background: #111827;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.25);
  font-size: 15px;
  cursor: pointer;
}
</style>
