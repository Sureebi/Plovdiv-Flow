<script setup>
defineProps({
  hasWaypoint: { type: Boolean, default: false },
  selectingWaypoint: { type: Boolean, default: false },
  selectedDestination: {
    type: Object,
    default: null
  },
  travelMode: {
    type: Object,
    required: true
  },
  activeRoute: {
    type: Object,
    default: null
  },
  locationStatus: {
    type: Object,
    required: true
  }
})

defineEmits(['toggle-waypoint', 'clear-waypoint'])

function formatDistance(distanceInMeters) {
  if (!distanceInMeters) return 'Pending'

  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)} m`
  }

  return `${(distanceInMeters / 1000).toFixed(1)} km`
}

function formatTrafficDelay(delayInSeconds) {
  if (delayInSeconds == null) return 'Unavailable'
  if (!delayInSeconds) return 'No delay'

  return `+${Math.round(delayInSeconds / 60)} min`
}
</script>

<template>
  <aside class="right-sidebar">
    <div
      class="location-status"
      :class="locationStatus.status"
    >
      <small>LOCATION</small>
      <strong>{{ locationStatus.message }}</strong>
    </div>

    <div v-if="selectedDestination" class="route-card">
      <div class="title">ACTIVE ROUTE</div>
      <strong>{{ selectedDestination.icon }} {{ selectedDestination.name }}</strong>
      <span>From current location by {{ travelMode.icon }} {{ travelMode.label }}</span>
      <div class="waypoint-actions">
        <button type="button" :aria-pressed="selectingWaypoint" @click="$emit('toggle-waypoint')">
          {{ selectingWaypoint ? 'Cancel selection' : hasWaypoint ? 'Change stop' : 'Add stop' }}
        </button>
        <button v-if="hasWaypoint" type="button" @click="$emit('clear-waypoint')">Remove stop</button>
      </div>
      <p v-if="selectingWaypoint" class="route-hint" role="status">Select stop location</p>
      <p v-if="activeRoute" class="route-hint" role="status">
        {{ activeRoute.traffic?.status === 'live' ? 'Traffic included at ' + new Date(activeRoute.traffic.updatedAt).toLocaleTimeString() : activeRoute.traffic?.reason === 'daily-limit' ? 'Daily traffic limit reached. Time excludes live traffic.' : 'Time excludes live traffic.' }}
      </p>
      <div v-if="activeRoute" class="route-meta">
        <div>
          <small>ESTIMATED TIME</small>
          <b>{{ activeRoute.durationInMinutes }} min</b>
        </div>
        <div>
          <small>DISTANCE</small>
          <b>{{ formatDistance(activeRoute.distanceInMeters) }}</b>
        </div>
        <div>
          <small>TRAFFIC</small>
          <b>{{ formatTrafficDelay(activeRoute.trafficDelayInSeconds) }}</b>
        </div>
        <div>
          <small>SOURCE</small>
          <b>{{ activeRoute.source }}</b>
        </div>
        <div>
          <small>VIA POINT</small>
          <b>{{ hasWaypoint ? 'On' : 'Off' }}</b>
        </div>
        <div>
          <small>ALTERNATIVES</small>
          <b>{{ activeRoute.alternativesCount ?? 0 }}</b>
        </div>
      </div>
    </div>

    <div class="title">SELECT WHAT TO SEE</div>

    <label>
      <input type="checkbox" disabled>
      Traffic map overlay (unavailable)
    </label>

    <label>
      <input type="checkbox" disabled>
      Congested roads
    </label>

    <label>
      <input type="checkbox" disabled>
      Incidents
    </label>

    <label>
      <input type="checkbox" disabled>
      Roadworks
    </label>

    <label>
      <input type="checkbox" disabled>
      Traffic lights
    </label>

    <label>
      <input type="checkbox" disabled>
      Problem intersections
    </label>
  </aside>
</template>

<style scoped>
.right-sidebar {
  width: 300px;
  height: 100vh;
  padding: 32px 24px;
  box-sizing: border-box;

  background: #ffffff;
  border-left: 1px solid #e5e7eb;

  position: relative;
  z-index: 20;
}

.title {
  margin-bottom: 22px;

  font-size: 12px;
  letter-spacing: 1.5px;
  color: #9ca3af;
}

.location-status {
  margin-bottom: 24px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #f3f4f6;
}

.location-status small {
  display: block;
  margin-bottom: 5px;
  font-size: 10px;
  color: #9ca3af;
}

.location-status strong {
  display: block;
  font-size: 13px;
  line-height: 1.35;
  color: #374151;
}

.location-status.ready {
  background: #eff6ff;
}

.location-status.ready strong {
  color: #1d4ed8;
}

.location-status.fallback {
  background: #fffbeb;
}

.location-status.fallback strong {
  color: #92400e;
}

.route-card {
  margin-bottom: 28px;
  padding-bottom: 22px;
  border-bottom: 1px solid #f3f4f6;
}

.route-card strong {
  display: block;
  margin-bottom: 6px;
  font-size: 18px;
  color: #111827;
}

.route-card span {
  color: #6b7280;
  font-size: 14px;
}

.route-hint {
  margin: 10px 0 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.35;
}

.waypoint-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.waypoint-actions button {
  padding: 8px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #ffffff;
  color: #374151;
  cursor: pointer;
}

.waypoint-actions button:hover,
.waypoint-actions button[aria-pressed='true'] {
  background: #eff6ff;
  border-color: #2563eb;
}

.waypoint-actions button:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.route-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
}

.route-meta div {
  padding: 12px;
  border-radius: 10px;
  background: #f9fafb;
}

.route-meta small {
  display: block;
  margin-bottom: 4px;
  font-size: 10px;
  color: #9ca3af;
}

.route-meta b {
  font-size: 15px;
  color: #111827;
}

label {
  display: flex;
  gap: 12px;
  align-items: center;

  padding: 16px 0;
  border-bottom: 1px solid #f3f4f6;

  font-size: 15px;
  color: #374151;
}

input[type="checkbox"] {
  width: 18px;
  height: 18px;
}

</style>
