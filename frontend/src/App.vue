<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { Map, NavigationControl, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

setWorkerUrl(workerUrl)

let map

onMounted(() => {
  map = new Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [24.7453, 42.1354],
    zoom: 12
  })

  map.addControl(new NavigationControl(), 'top-right')
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
  }
})
</script>

<template>
  <div id="map"></div>
</template>

<style>
#map {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
}
</style>