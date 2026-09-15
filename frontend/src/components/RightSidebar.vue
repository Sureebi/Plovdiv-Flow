<script setup>
defineProps({
  hasWaypoint: { type: Boolean, default: false },
  selectingWaypoint: { type: Boolean, default: false },
  showTraffic: { type: Boolean, default: true },
  showIncidents: { type: Boolean, default: true },
  showRoadworks: { type: Boolean, default: true },
  routeReversed: { type: Boolean, default: false },
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

defineEmits(['toggle-waypoint', 'clear-waypoint', 'reverse-route', 'toggle-traffic', 'toggle-incidents', 'toggle-roadworks'])

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

function formatDuration(durationInSeconds) {
  if (durationInSeconds == null) return 'Unavailable'
  return `${Math.max(1, Math.round(durationInSeconds / 60))} min`
}

function formatEstimatedTime(route, travelMode) {
  if (!route) return 'Pending'
  if (travelMode.id !== 'car' || route.traffic?.status !== 'live') {
    return `${route.durationInMinutes} min`
  }

  const current = route.durationInMinutes
  const clear = route.traffic.noTrafficTravelTimeInSeconds / 60
  const usual = route.traffic.historicTrafficTravelTimeInSeconds / 60
  const live = route.traffic.liveTrafficTravelTimeInSeconds / 60
  const estimates = [current, usual, live].filter((value) => Number.isFinite(value))

  if (!Number.isFinite(clear) || !estimates.length) return `${current} min`

  const trafficDifference = Math.max(1, ...estimates.map((value) => value - clear))
  const minimum = Math.max(1, Math.floor(Math.min(...estimates) - trafficDifference * (2 / 3)))
  const maximum = Math.max(minimum, Math.ceil(Math.max(...estimates) + trafficDifference * 2))
  return minimum === maximum ? `${maximum} min` : `${minimum}–${maximum} min`
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
      <span>
        {{ routeReversed ? `From ${selectedDestination.name} to current location` : `From current location to ${selectedDestination.name}` }}
        by {{ travelMode.icon }} {{ travelMode.label }}
      </span>
      <div class="waypoint-actions">
        <button type="button" class="reverse-route" title="Reverse route" @click="$emit('reverse-route')">
          <span aria-hidden="true">⇄</span> Reverse
        </button>
        <button type="button" :aria-pressed="selectingWaypoint" @click="$emit('toggle-waypoint')">
          {{ selectingWaypoint ? 'Cancel selection' : hasWaypoint ? 'Change stop' : 'Add stop' }}
        </button>
        <button v-if="hasWaypoint" type="button" @click="$emit('clear-waypoint')">Remove stop</button>
      </div>
      <p v-if="selectingWaypoint" class="route-hint" role="status">Select stop location</p>
      <p v-if="activeRoute" class="route-hint" role="status">
        {{ activeRoute.traffic?.status === 'live' ? 'Traffic included at ' + new Date(activeRoute.traffic.updatedAt).toLocaleTimeString() : activeRoute.traffic?.reason === 'daily-limit' ? 'Daily traffic limit reached. Time excludes live traffic.' : 'Time excludes live traffic.' }}
      </p>
      <p v-if="activeRoute?.traffic?.status === 'live'" class="route-hint traffic-explanation">
        Current estimate: {{ activeRoute.durationInMinutes }} min. The planning range adds a conservative traffic buffer.
      </p>
      <div v-if="activeRoute" class="route-meta">
        <div>
          <small>{{ travelMode.id === 'car' ? 'PLANNING RANGE' : 'ESTIMATED TIME' }}</small>
          <b>{{ formatEstimatedTime(activeRoute, travelMode) }}</b>
        </div>
        <div>
          <small>DISTANCE</small>
          <b>{{ formatDistance(activeRoute.distanceInMeters) }}</b>
        </div>
        <div>
          <small>DELAY VS CLEAR ROADS</small>
          <b>{{ formatTrafficDelay(activeRoute.trafficDelayInSeconds) }}</b>
        </div>
        <div>
          <small>USUAL AT THIS TIME</small>
          <b>{{ formatDuration(activeRoute.traffic?.historicTrafficTravelTimeInSeconds) }}</b>
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
      <input
        type="checkbox"
        :checked="showTraffic"
        @change="$emit('toggle-traffic', $event.target.checked)"
      >
      Traffic delays
    </label>

    <div v-if="showTraffic" class="traffic-legend" aria-label="Traffic colors">
      <span><i class="slow"></i>Slow</span>
      <span><i class="heavy"></i>Heavy</span>
      <span><i class="closed"></i>Closed</span>
    </div>

    <label>
      <input
        type="checkbox"
        :checked="showIncidents"
        @change="$emit('toggle-incidents', $event.target.checked)"
      >
      Incidents
    </label>

    <label>
      <input
        type="checkbox"
        :checked="showRoadworks"
        @change="$emit('toggle-roadworks', $event.target.checked)"
      >
      Roadworks
    </label>

    <div class="event-legend" aria-label="Event markers">
      <span><i class="incident">!</i>Incident</span>
      <span><i class="roadwork">R</i>Roadwork</span>
    </div>
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
  overflow-y: auto;
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

.traffic-explanation {
  padding-left: 9px;
  border-left: 3px solid #2563eb;
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

.waypoint-actions .reverse-route {
  color: #1d4ed8;
  border-color: #93c5fd;
}

.waypoint-actions .reverse-route span {
  color: inherit;
  font-size: 16px;
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
  font-size: 15px;
  color: #374151;
}

input[type="checkbox"] {
  width: 18px;
  height: 18px;
}

.traffic-legend {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px 12px;
  padding: 12px 0 4px;
  color: #6b7280;
  font-size: 12px;
}

.traffic-legend span {
  display: flex;
  align-items: center;
  gap: 7px;
}

.traffic-legend i {
  width: 18px;
  height: 4px;
  border-radius: 2px;
  background: #f1bf40;
}

.traffic-legend .heavy { background: #e70704; }
.traffic-legend .closed { background: #777777; }

.event-legend {
  display: flex;
  gap: 16px;
  padding-top: 12px;
  color: #6b7280;
  font-size: 12px;
}

.event-legend span { display: flex; align-items: center; gap: 6px; }
.event-legend i {
  width: 17px;
  height: 17px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #7c3aed;
  color: #ffffff;
  font-size: 10px;
  font-style: normal;
  font-weight: 700;
}
.event-legend .roadwork { background: #f59e0b; color: #111827; }

</style>
