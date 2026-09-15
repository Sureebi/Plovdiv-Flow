<script setup>
import LeftSidebar from './components/LeftSidebar.vue'
import RightSidebar from './components/RightSidebar.vue'
import MapView from './components/MapView.vue'

function handleQuickTravel(place) {
  console.log('Travel from current location to:', place)
}
</script>

<template>
  <div class="app-shell">
    <LeftSidebar @quick-travel="handleQuickTravel" />

    <main class="map-area">
      <MapView />
    </main>

    <RightSidebar />
  </div>
</template>

<style>
#map {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
}
</style>