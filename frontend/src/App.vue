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
const routeReversed = ref(false)
const waypoint = ref(null)
const selectingWaypoint = ref(false)
const showTraffic = ref(true)
const showIncidents = ref(true)
const showRoadworks = ref(true)
const customLocations = ref(loadCustomLocations())
const editingLocationId = ref(null)
const mobilePanel = ref(null)
const locationStatus = ref({
  status: 'pending',
  message: 'Finding current location...'
})

function handleQuickTravel(place) {
  waypoint.value = null
  selectingWaypoint.value = false
  editingLocationId.value = null
  routeReversed.value = false
  selectedDestination.value = place
  mobilePanel.value = null
}

function reverseRoute() {
  routeReversed.value = !routeReversed.value
  activeRoute.value = null
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
  mobilePanel.value = null
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
  if (selectingWaypoint.value) mobilePanel.value = null
}

function handleTravelModeChange(mode) {
  selectedTravelMode.value = mode
}

function handleRouteCalculated(route) {
  activeRoute.value = route
}

function toggleMobilePanel(panel) {
  mobilePanel.value = mobilePanel.value === panel ? null : panel
}

function handleLocationStatusChange(status) {
  locationStatus.value = status
}
</script>

<template>
  <div class="app-shell">
    <header class="mobile-toolbar">
      <button type="button" aria-label="Open places" :aria-expanded="mobilePanel === 'places'" @click="toggleMobilePanel('places')">
        <span aria-hidden="true">☰</span>
        <small>Places</small>
      </button>
      <div class="mobile-brand">
        <img src="/favicon-32.png" alt="">
        <strong>Plovdiv Flow</strong>
      </div>
      <button type="button" aria-label="Open route details" :aria-expanded="mobilePanel === 'route'" @click="toggleMobilePanel('route')">
        <span aria-hidden="true">↗</span>
        <small>Route</small>
      </button>
    </header>

    <button
      v-if="mobilePanel"
      type="button"
      class="mobile-backdrop"
      aria-label="Close panel"
      @click="mobilePanel = null"
    ></button>

    <LeftSidebar
      :class="{ 'mobile-open': mobilePanel === 'places' }"
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
        :route-reversed="routeReversed"
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
      :class="{ 'mobile-open': mobilePanel === 'route' }"
      :selected-destination="selectedDestination"
      :travel-mode="selectedTravelMode"
      :active-route="activeRoute"
      :route-reversed="routeReversed"
      :location-status="locationStatus"
      :has-waypoint="!!waypoint"
      :selecting-waypoint="selectingWaypoint"
      :show-traffic="showTraffic"
      :show-incidents="showIncidents"
      :show-roadworks="showRoadworks"
      @toggle-waypoint="toggleWaypointSelection"
      @clear-waypoint="clearWaypoint"
      @reverse-route="reverseRoute"
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

.mobile-toolbar,
.mobile-backdrop {
  display: none;
}

@media (max-width: 800px) {
  .mobile-toolbar {
    position: fixed;
    inset: 0 0 auto 0;
    z-index: 40;
    display: grid;
    grid-template-columns: 64px 1fr 64px;
    align-items: center;
    height: calc(58px + env(safe-area-inset-top));
    padding: env(safe-area-inset-top) 8px 0;
    background: rgba(255, 255, 255, 0.96);
    border-bottom: 1px solid #e5e7eb;
    backdrop-filter: blur(10px);
  }

  .mobile-toolbar button {
    height: 50px;
    padding: 4px;
    border: 0;
    background: transparent;
    color: #374151;
    cursor: pointer;
  }

  .mobile-toolbar button span,
  .mobile-toolbar button small {
    display: block;
  }

  .mobile-toolbar button span { font-size: 21px; line-height: 23px; }
  .mobile-toolbar button small { font-size: 10px; }
  .mobile-toolbar button[aria-expanded='true'] { color: #1d4ed8; }

  .mobile-brand {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: 0;
    color: #111827;
  }

  .mobile-brand img { width: 28px; height: 28px; border-radius: 7px; }
  .mobile-brand strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 16px; }

  .mobile-backdrop {
    position: fixed;
    inset: 0;
    z-index: 29;
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    background: rgba(17, 24, 39, 0.32);
  }

  #map {
    height: 100dvh;
  }
}
</style>
