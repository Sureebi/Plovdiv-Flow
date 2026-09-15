<template>
  <aside class="right-sidebar">
    <div class="title">SELECT WHAT TO SEE</div>

    <label>
      <input type="checkbox" checked>
      Live traffic
    </label>

    <label>
      <input type="checkbox" checked>
      Congested roads
    </label>

    <label>
      <input type="checkbox">
      Incidents
    </label>

    <label>
      <input type="checkbox">
      Roadworks
    </label>

    <label>
      <input type="checkbox">
      Traffic lights
    </label>

    <label>
      <input type="checkbox">
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