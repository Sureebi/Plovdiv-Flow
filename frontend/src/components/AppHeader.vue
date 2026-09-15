<template>
  <div class="brand-panel">
    <div class="brand-top">
      <div>
        <span class="eyebrow">PLOVDIV</span>
        <h1>Flow</h1>
      </div>

      <div class="live-badge">
        <span class="live-dot"></span>
        LIVE
      </div>
    </div>

    <p>Real-time traffic intelligence</p>

    <div class="update-status">
      Updated just now
    </div>
  </div>
</template>

<style scoped>
.brand-panel {
  position: absolute;
  top: 24px;
  left: 24px;
  z-index: 10;

  width: 280px;
  padding: 20px;

  background: rgba(15, 18, 22, 0.88);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);

  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;

  color: white;

  box-shadow:
    0 20px 50px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.brand-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.eyebrow {
  display: block;
  margin-bottom: 2px;

  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;

  opacity: 0.5;
}

h1 {
  margin: 0;

  font-size: 30px;
  line-height: 1;
  font-weight: 700;
}

p {
  margin: 10px 0 16px;

  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}

.live-badge {
  display: flex;
  align-items: center;
  gap: 7px;

  padding: 7px 10px;

  border-radius: 999px;

  background: rgba(34, 197, 94, 0.12);

  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.8px;
}

.live-dot {
  width: 7px;
  height: 7px;

  border-radius: 50%;
  background: #22c55e;

  box-shadow: 0 0 10px rgba(34, 197, 94, 0.9);
}

.update-status {
  padding-top: 12px;

  border-top: 1px solid rgba(255, 255, 255, 0.07);

  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}
</style>