<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import {
  Map,
  NavigationControl,
  Marker,
  Popup,
  setWorkerUrl
} from 'maplibre-gl'

import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

setWorkerUrl(workerUrl)

let map
let userMarker

onMounted(() => {
  map = new Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [24.7453, 42.1354],
    zoom: 13.5
  })

  map.addControl(new NavigationControl(), 'top-right')

  if (!('geolocation' in navigator)) {
    console.warn('Geolocation is not supported in this browser.')
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lng = position.coords.longitude
      const lat = position.coords.latitude

      console.log('User location:', { lat, lng })

      const markerElement = document.createElement('div')
      markerElement.className = 'user-location-marker'

      userMarker = new Marker({ element: markerElement })
        .setLngLat([lng, lat])
        .setPopup(new Popup({ offset: 20 }).setText('You are here'))
        .addTo(map)

      map.flyTo({
        center: [lng, lat],
        zoom: 15
      })
    },
    (error) => {
      console.warn('Location unavailable:', error)
      alert('Location access failed: ' + error.message)
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  )
})

onBeforeUnmount(() => {
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

:global(.user-location-marker) {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #2563eb;
  border: 3px solid white;
  box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.25);
}
</style>