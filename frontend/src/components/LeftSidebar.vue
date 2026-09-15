<script setup>
defineProps({
  destinations: {
    type: Array,
    required: true
  },
  travelModes: {
    type: Array,
    required: true
  },
  selectedDestinationId: {
    type: String,
    default: null
  },
  selectedTravelModeId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['quick-travel', 'travel-mode-change'])

function selectPlace(place) {
  emit('quick-travel', place)
}

function selectTravelMode(mode) {
  emit('travel-mode-change', mode)
}
</script>

<template>
  <aside class="left-sidebar">
    <div class="brand">
      <span class="eyebrow">PLOVDIV</span>
      <h1>Flow</h1>
      <p>Traffic intelligence</p>
    </div>

    <div class="section">
      <span class="section-title">QUICK TRAVEL</span>

      <div class="current-location">
        <span>📍</span>
        <div>
          <small>FROM</small>
          <strong>Current location</strong>
        </div>
      </div>

      <div class="mode-selector">
        <button
          v-for="mode in travelModes"
          :key="mode.id"
          class="mode-button"
          :class="{ active: mode.id === selectedTravelModeId }"
          @click="selectTravelMode(mode)"
        >
          <span>{{ mode.icon }}</span>
          <small>{{ mode.label }}</small>
        </button>
      </div>

      <button
        v-for="place in destinations"
        :key="place.id"
        class="quick-place"
        :class="{ active: place.id === selectedDestinationId }"
        @click="selectPlace(place)"
      >
        <span>{{ place.icon }}</span>
        <span>{{ place.name }}</span>
        <span class="arrow">›</span>
      </button>
    </div>

    <div class="section">
      <span class="section-title">SAVED PLACES</span>

      <button class="add-place">
        + Add location
      </button>
    </div>
  </aside>
</template>

<style scoped>

.left-sidebar {
  width: 320px;
  height: 100vh;
  padding: 32px 26px;
  box-sizing: border-box;

  background: #ffffff;
  border-right: 1px solid #e5e7eb;

  position: relative;
  z-index: 20;
}

.brand {
  margin-bottom: 34px;
}

.eyebrow {
  font-size: 12px;
  letter-spacing: 2px;
  color: #9ca3af;
}

h1 {
  margin: 4px 0 0;
  font-size: 36px;
  color: #111827;
}

p {
  margin: 8px 0 0;
  font-size: 14px;
  color: #6b7280;
}

.section {
  margin-top: 28px;
}

.section-title {
  display: block;
  margin-bottom: 14px;

  font-size: 12px;
  letter-spacing: 1.4px;
  color: #9ca3af;
}

.current-location {
  display: flex;
  gap: 12px;
  align-items: center;

  margin-bottom: 16px;
  padding: 14px 16px;

  background: #f3f4f6;
  border-radius: 12px;
}

.current-location small {
  display: block;
  font-size: 10px;
  color: #9ca3af;
}

.current-location strong {
  font-size: 14px;
  color: #111827;
}

.mode-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}

.mode-button {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
  padding: 10px 6px;
  display: grid;
  gap: 4px;
  place-items: center;
  cursor: pointer;
}

.mode-button small {
  font-size: 11px;
  color: #6b7280;
}

.mode-button.active {
  border-color: #2563eb;
  background: #eff6ff;
}

.mode-button.active small {
  color: #1d4ed8;
  font-weight: 700;
}

.quick-place,
.add-place {
  width: 100%;
  border: 0;
  background: transparent;

  display: flex;
  align-items: center;
  gap: 12px;

  padding: 15px 6px;

  font-size: 15px;
  cursor: pointer;
}

.quick-place:hover {
  background: #f9fafb;
  border-radius: 10px;
}

.quick-place.active {
  background: #eff6ff;
  border-radius: 10px;
  color: #1d4ed8;
  font-weight: 600;
}

.arrow {
  margin-left: auto;
  font-size: 22px;
  color: #9ca3af;
}

.add-place {
  color: #2563eb;
  font-weight: 500;
}

</style>
