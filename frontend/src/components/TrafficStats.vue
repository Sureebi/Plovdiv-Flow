<template>
  <aside class="stats-panel">
    <div class="panel-title">City Status</div>

    <div class="stat-row">
      <span>Traffic</span>
      <strong class="status-good">Normal</strong>
    </div>

    <div class="stat-row">
      <span>Average speed</span>
      <strong>-- km/h</strong>
    </div>

    <div class="stat-row">
      <span>Incidents</span>
      <strong>0</strong>
    </div>

    <div class="stat-row">
      <span>Congestion</span>
      <strong>--%</strong>
    </div>
  </aside>
</template>

<style scoped>
.stats-panel {
  position: absolute;
  top: 190px;
  left: 24px;
  z-index: 10;

  width: 280px;
  padding: 18px;

  background: rgba(15, 18, 22, 0.88);
  backdrop-filter: blur(18px);

  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;

  color: white;

  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.22);
}

.panel-title {
  margin-bottom: 14px;

  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;

  color: rgba(255, 255, 255, 0.4);
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;

  padding: 13px 0;

  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.stat-row:last-child {
  border-bottom: 0;
}

.stat-row span {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}

.stat-row strong {
  font-size: 13px;
}

.status-good {
  color: #4ade80;
}
</style>