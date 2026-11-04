<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

// Sprite sheet: 6 columns × 5 rows of 176×176 cells, shown at 96px.
const CELL = 96;
const HOLD_MS = 250; // how long to hold before the mascot can be dragged
const BASE_BOTTOM = 68; // px above the bottom of the screen, matches the nav bar

const ANIMS = {
  idle: { row: 0, frames: 4, speed: 0.9, time: 1600 },
  walk: { row: 1, frames: 6, speed: 0.6, time: 0 },
  react: { row: 2, frames: 4, speed: 0.5, time: 1600 },
  react2: { row: 3, frames: 6, speed: 0.5, time: 1600 },
  rage: { row: 4, frames: 6, speed: 0.4, time: 0 }, // held while dragging
};

const REACTIONS = [
  { anim: 'react', line: '¿Quieres leer la verdad?' },
  { anim: 'react2', line: 'Los dioses no cuentan monedas, pero yo sí.' },
  { anim: 'react', line: 'Que los dioses verdaderos guien tu camino.' },
];

const DRAG_LINE = '¡Eh, que me mareo!';

const anim = ref('idle');
const x = ref(8);
const y = ref(0); // vertical offset from the base position, 0 or negative (up)
const face = ref(1);
const bubble = ref('');
const dragging = ref(false);
const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DRAG_OFFSET_Y = 60;

let target = null;
let pauseUntil = 0;
let frameId;
let actionTimer;
let holdTimer;
let dragged = false;
let startX = 0;
let startY = 0;
let grabX = 0;
let grabY = 0;
let last = 0;

const GRAVITY = 2;
const GROUND_Y = 0;

function setAnim(name, text = '') {
  anim.value = name;
  bubble.value = text;
  target = null;
  clearTimeout(actionTimer);
  const time = ANIMS[name].time;
  if (!time) return;
  actionTimer = setTimeout(() => {
    anim.value = 'idle';
    bubble.value = '';
    pauseUntil = performance.now() + 2000 + Math.random() * 4000;
  }, time);
}

function onTap() {
  if (dragged) return;

  const reaction = REACTIONS[Math.floor(Math.random() * REACTIONS.length)];

  setAnim(reaction.anim, reaction.line);
}

function onPointerDown(e) {
  dragged = false;
  startX = e.clientX;
  startY = e.clientY;
  grabX = x.value;
  grabY = y.value;
  e.currentTarget.setPointerCapture(e.pointerId);
  clearTimeout(holdTimer);
  holdTimer = setTimeout(startDrag, HOLD_MS);
}

function startDrag(e) {
  dragging.value = true;
  setAnim('rage', DRAG_LINE);

  grabX = x.value;
  grabY = y.value;
  startX = e.clientX;
  startY = e.clientY;
}

function onPointerMove(e) {
  if (!dragging.value) {
    // moving before the hold completes cancels it, so scrolling the page does not grab the mascot
    if (Math.abs(e.clientX - startX) > 10 || Math.abs(e.clientY - startY) > 10) clearTimeout(holdTimer);
    return;
  }
  dragged = true;
  const maxX = window.innerWidth - CELL - 8;
  const minY = -(window.innerHeight - BASE_BOTTOM - CELL - 40);
  x.value = Math.min(maxX, Math.max(8, grabX + (e.clientX - startX)));
  y.value = Math.min(0, Math.max(minY, grabY + (e.clientY - startY) + DRAG_OFFSET_Y));
  face.value = e.clientX >= startX ? 1 : -1;
}

function onPointerUp() {
  clearTimeout(holdTimer);
  if (!dragging.value) return;

  dragging.value = false;
  setAnim('idle');
  pauseUntil = performance.now() + 1500;
}

function pickTarget() {
  const max = window.innerWidth - CELL - 8;
  target = 8 + Math.random() * Math.max(0, max - 8);
  face.value = target > x.value ? 1 : -1;
  anim.value = 'walk';
}

function tick(now) {
  const dt = Math.min(now - last, 50) / 1000;
  last = now;

  const busy = anim.value !== 'walk' && anim.value !== 'idle';
  if (!reduced && !busy && !dragging.value) {
    if (target === null && now > pauseUntil) {
      pickTarget();
    } else if (target !== null) {
      x.value += 42 * dt * face.value;
      if ((face.value > 0 && x.value >= target) || (face.value < 0 && x.value <= target)) {
        x.value = target;
        target = null;
        anim.value = 'idle';
        pauseUntil = now + 3000 + Math.random() * 5000;
      }
    }
  }

  // Gravedad: cae cuando no está agarrada
  if (!dragging.value && y.value < GROUND_Y) {
    y.value = Math.min(GROUND_Y, y.value + GRAVITY);
  }

  frameId = requestAnimationFrame(tick);
}

onMounted(() => {
  last = performance.now();
  pauseUntil = last + 2500;
  frameId = requestAnimationFrame(tick);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(frameId);
  clearTimeout(actionTimer);
  clearTimeout(holdTimer);
});
</script>

<template>
  <button
    class="mascot"
    :class="{ 'is-dragging': dragging }"
    :style="{ left: x + 'px', transform: `translateY(${y}px)` }"
    aria-label="Tu compañera"
    @click="onTap"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <span v-if="bubble" class="bubble" role="status">{{ bubble }}</span>
    <span
      class="sprite"
      :style="{
        backgroundPosition: `0px ${-ANIMS[anim].row * CELL}px`,
        '--n': ANIMS[anim].frames,
        '--dur': ANIMS[anim].speed + 's',
        '--face': face,
      }"
    />
  </button>
</template>

<style scoped>
.mascot {
  position: fixed;
  bottom: calc(68px + env(safe-area-inset-bottom, 0px));
  z-index: 4;
  width: 96px;
  height: 96px;
  padding: 0;
  min-height: 0;
  border: 0;
  background: none;
  border-radius: 0;
  touch-action: none;
  transition: transform 0.35s ease-out;
}

.mascot.is-dragging {
  transition: none;
  cursor: grabbing;
}

.sprite {
  display: block;
  width: 96px;
  height: 96px;
  background-image: url('/mascot-sheet.png');
  background-size: calc(6 * 96px) calc(5 * 96px);
  transform: scaleX(var(--face));
  pointer-events: none;
  animation: play var(--dur) steps(var(--n)) infinite;
}

@keyframes play {
  from {
    background-position-x: 0px;
  }
  to {
    background-position-x: calc(var(--n) * -96px);
  }
}

.bubble {
  position: absolute;
  left: 96px;
  bottom: 70px;
  width: max-content;
  max-width: 200px;
  padding: 8px 12px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  font: italic 400 15px/1.3 var(--disp);
  color: var(--ink);
  text-align: left;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .sprite {
    animation: none;
  }
}
</style>
