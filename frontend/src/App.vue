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
const showTraffic = ref(true)
const showIncidents = ref(true)
const showRoadworks = ref(true)
const customLocations = ref(loadCustomLocations())
const editingLocationId = ref(null)
const locationStatus = ref({
  status: 'pending',
  message: 'Finding current location...'
})

function handleQuickTravel(place) {
  waypoint.value = null
  selectingWaypoint.value = false
  editingLocationId.value = null
  selectedDestination.value = place
}

function loadCustomLocations() {
  try {
    const saved = JSON.parse(localStorage.getItem('plovdiv-flow-locations') ?? '[]')
    return Array.isArray(saved) ? saved.slice(0, 2) : []
  } catch {
    return []
  }
}

function saveCustomLocations() {
  localStorage.setItem('plovdiv-flow-locations', JSON.stringify(customLocations.value))
}

function startAddingLocation(location = null) {
  selectingWaypoint.value = false
  editingLocationId.value = location?.id ?? (
    customLocations.value.some((place) => place.id === 'custom-1') ? 'custom-2' : 'custom-1'
  )
}

function handleLocationSelected(coordinates) {
  const existingIndex = customLocations.value.findIndex((place) => place.id === editingLocationId.value)
  const place = {
    id: editingLocationId.value,
    name: existingIndex >= 0 ? customLocations.value[existingIndex].name : `Saved place ${editingLocationId.value.endsWith('1') ? 1 : 2}`,
    icon: '📌',
    description: 'Custom saved location',
    coordinates
  }

  if (existingIndex >= 0) customLocations.value.splice(existingIndex, 1, place)
  else if (customLocations.value.length < 2) customLocations.value.push(place)

  if (selectedDestination.value?.id === place.id) selectedDestination.value = place
  editingLocationId.value = null
  saveCustomLocations()
}

function removeCustomLocation(place) {
  customLocations.value = customLocations.value.filter((item) => item.id !== place.id)
  if (selectedDestination.value?.id === place.id) {
    selectedDestination.value = null
    activeRoute.value = null
  }
  if (editingLocationId.value === place.id) editingLocationId.value = null
  saveCustomLocations()
}

function handleWaypointSelected(coordinates) {
  waypoint.value = coordinates
  selectingWaypoint.value = false
}

function clearWaypoint() {
  waypoint.value = null
  selectingWaypoint.value = false
}

function toggleWaypointSelection() {
  editingLocationId.value = null
  selectingWaypoint.value = !selectingWaypoint.value
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
      :saved-locations="customLocations"
      :selecting-location="!!editingLocationId"
      @quick-travel="handleQuickTravel"
      @travel-mode-change="handleTravelModeChange"
      @add-location="startAddingLocation()"
      @edit-location="startAddingLocation"
      @remove-location="removeCustomLocation"
      @cancel-location="editingLocationId = null"
    />

    <main class="map-area">
      <MapView
        :destination="selectedDestination"
        :travel-mode="selectedTravelMode"
        :waypoint="waypoint"
        :selecting-waypoint="selectingWaypoint"
        :show-traffic="showTraffic"
        :show-incidents="showIncidents"
        :show-roadworks="showRoadworks"
        :selecting-location="!!editingLocationId"
        :saved-locations="customLocations"
        @waypoint-selected="handleWaypointSelected"
        @cancel-waypoint="selectingWaypoint = false"
        @route-calculated="handleRouteCalculated"
        @location-status-change="handleLocationStatusChange"
        @saved-location-selected="handleLocationSelected"
        @cancel-location="editingLocationId = null"
        @saved-location-open="handleQuickTravel"
      />
    </main>

    <RightSidebar
      :selected-destination="selectedDestination"
      :travel-mode="selectedTravelMode"
      :active-route="activeRoute"
      :location-status="locationStatus"
      :has-waypoint="!!waypoint"
      :selecting-waypoint="selectingWaypoint"
      :show-traffic="showTraffic"
      :show-incidents="showIncidents"
      :show-roadworks="showRoadworks"
      @toggle-waypoint="toggleWaypointSelection"
      @clear-waypoint="clearWaypoint"
      @toggle-traffic="showTraffic = $event"
      @toggle-incidents="showIncidents = $event"
      @toggle-roadworks="showRoadworks = $event"
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
