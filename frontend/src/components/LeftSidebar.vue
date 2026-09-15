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
  },
  savedLocations: { type: Array, required: true },
  selectingLocation: { type: Boolean, default: false }
})

const emit = defineEmits(['quick-travel', 'travel-mode-change', 'add-location', 'edit-location', 'remove-location', 'cancel-location'])

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

      <div v-for="place in savedLocations" :key="place.id" class="saved-place-row">
        <button
          class="saved-place"
          :class="{ active: place.id === selectedDestinationId }"
          @click="selectPlace(place)"
        >
          <span>{{ place.icon }}</span>
          <span>{{ place.name }}</span>
        </button>
        <button class="icon-button" :title="`Move ${place.name}`" :aria-label="`Move ${place.name}`" @click="$emit('edit-location', place)">⌖</button>
        <button class="icon-button remove" :title="`Remove ${place.name}`" :aria-label="`Remove ${place.name}`" @click="$emit('remove-location', place)">×</button>
      </div>

      <button v-if="selectingLocation" class="add-place selecting" @click="$emit('cancel-location')">
        Cancel selection
      </button>
      <button v-else-if="savedLocations.length < 2" class="add-place" @click="$emit('add-location')">
        + Add location {{ savedLocations.length + 1 }}
      </button>
      <p v-if="selectingLocation" class="selection-hint">Choose the location on the map.</p>
      <p v-else-if="savedLocations.length === 2" class="selection-hint">Two saved locations added.</p>
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
  overflow-y: auto;
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

.saved-place-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 36px 36px;
  align-items: center;
  border-bottom: 1px solid #f3f4f6;
}

.saved-place {
  min-width: 0;
  padding: 13px 6px;
  border: 0;
  background: transparent;
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 14px;
  cursor: pointer;
}

.saved-place.active {
  color: #1d4ed8;
  font-weight: 600;
}

.icon-button {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #6b7280;
  font-size: 18px;
  cursor: pointer;
}

.icon-button:hover { background: #f3f4f6; color: #111827; }
.icon-button.remove:hover { background: #fef2f2; color: #dc2626; }
.add-place.selecting { color: #dc2626; }

.selection-hint {
  margin: 4px 6px 0;
  font-size: 12px;
  line-height: 1.4;
  color: #6b7280;
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
