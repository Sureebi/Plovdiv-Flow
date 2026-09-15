<script setup>
import { ref } from 'vue'
import LeftSidebar from './components/LeftSidebar.vue'
import RightSidebar from './components/RightSidebar.vue'
import MapView from './components/MapView.vue'
import { savedDestinations } from './data/destinations'
import { defaultTravelMode, travelModes } from './data/travelModes'

const selectedDestination = ref(null)
const selectedTravelMode = ref(defaultTravelMode)
const activeRoute = ref(null)
const waypoint = ref(null)
const selectingWaypoint = ref(false)
const locationStatus = ref({
  status: 'pending',
  message: 'Finding current location...'
})

function handleQuickTravel(place) {
  waypoint.value = null
  selectingWaypoint.value = false
  selectedDestination.value = place
}

function handleWaypointSelected(coordinates) {
  waypoint.value = coordinates
  selectingWaypoint.value = false
}

function clearWaypoint() {
  waypoint.value = null
  selectingWaypoint.value = false
}

function handleTravelModeChange(mode) {
  selectedTravelMode.value = mode
}

function handleRouteCalculated(route) {
  activeRoute.value = route
}

function handleLocationStatusChange(status) {
  locationStatus.value = status
}
</script>

<template>
  <div class="app-shell">
    <LeftSidebar
      :destinations="savedDestinations"
      :travel-modes="travelModes"
      :selected-destination-id="selectedDestination?.id"
      :selected-travel-mode-id="selectedTravelMode.id"
      @quick-travel="handleQuickTravel"
      @travel-mode-change="handleTravelModeChange"
    />

    <main class="map-area">
      <MapView
        :destination="selectedDestination"
        :travel-mode="selectedTravelMode"
        :waypoint="waypoint"
        :selecting-waypoint="selectingWaypoint"
        @waypoint-selected="handleWaypointSelected"
        @cancel-waypoint="selectingWaypoint = false"
        @route-calculated="handleRouteCalculated"
        @location-status-change="handleLocationStatusChange"
      />
    </main>

    <RightSidebar
      :selected-destination="selectedDestination"
      :travel-mode="selectedTravelMode"
      :active-route="activeRoute"
      :location-status="locationStatus"
      :has-waypoint="!!waypoint"
      :selecting-waypoint="selectingWaypoint"
      @toggle-waypoint="selectingWaypoint = !selectingWaypoint"
      @clear-waypoint="clearWaypoint"
    />
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
