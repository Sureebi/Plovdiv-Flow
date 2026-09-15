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
  destination: {
    type: Object,
    default: null
  },
  travelMode: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['route-calculated', 'location-status-change', 'waypoint-selected', 'cancel-waypoint'])

let map
let userMarker
let destinationMarker
let waypointMarker
let currentPosition = null
let mapLoaded = false
let routeRequestId = 0
let locationStatus = 'pending'
let locationMessage = 'Finding current location...'

const routeSourceId = 'quick-travel-route'
const routeLayerId = 'quick-travel-route-line'
const alternativeRoutesSourceId = 'quick-travel-alternatives'
const alternativeRoutesLayerId = 'quick-travel-alternatives-line'
const fallbackPosition = [24.7453, 42.1354]

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
      'line-opacity': 0.9
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
    if (props.destination) {
      drawRouteToDestination(props.destination, props.travelMode)
    }
  })

  map.on('click', (event) => {
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
  if (map) map.getCanvas().style.cursor = selecting ? 'crosshair' : ''
})

function handleKeydown(event) {
  if (event.key === 'Escape' && props.selectingWaypoint) emit('cancel-waypoint')
}

onMounted(() => window.addEventListener('keydown', handleKeydown))

onBeforeUnmount(() => {
  mapLoaded = false
  routeRequestId++
  window.removeEventListener('keydown', handleKeydown)
  if (waypointMarker) waypointMarker.remove()
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
</style>
