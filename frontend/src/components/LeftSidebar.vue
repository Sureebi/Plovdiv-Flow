<script setup>
const quickPlaces = [
  { name: 'Home', icon: '🏠' },
  { name: 'Work', icon: '💼' },
  { name: 'Center', icon: '⭐' }
]

const emit = defineEmits(['quick-travel'])

function selectPlace(place) {
  emit('quick-travel', place)
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

      <button
        v-for="place in quickPlaces"
        :key="place.name"
        class="quick-place"
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