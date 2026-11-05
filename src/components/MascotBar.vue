<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';

// Sprite sheets. Every cell is 176×176 and is shown at 96px.
const CELL = 96;
const HOLD_MS = 250; // how long to hold before the mascot can be dragged
const BASE_BOTTOM = 68; // px above the bottom of the screen, matches the nav bar

const SHEETS = {
  main: { src: '/mascot-sheet.png', cols: 6, rows: 5 },
  extra: { src: '/mascot-sheet-2.png', cols: 12, rows: 3 }, // dance, record, sleep
};

// Each animation is one row of its sheet. `time` is how long it lasts before going back to idle (0 = until something ends it).
const ANIMS = {
  idle: { sheet: 'main', row: 0, frames: 4, speed: 0.9, time: 1600 },
  walk: { sheet: 'main', row: 1, frames: 6, speed: 0.6, time: 0 },
  react: { sheet: 'main', row: 2, frames: 4, speed: 0.5, time: 1600 },
  react2: { sheet: 'main', row: 3, frames: 6, speed: 0.5, time: 1600 },
  rage: { sheet: 'main', row: 4, frames: 6, speed: 0.4, time: 0 }, // held while dragging
  dance: { sheet: 'extra', row: 0, frames: 12, speed: 1.2, time: 0 }, // while the song plays
  vinyl: { sheet: 'extra', row: 1, frames: 8, speed: 4.8, time: 0 }, // putting the record on (0.6s per frame)
  sleep: { sheet: 'extra', row: 2, frames: 8, speed: 2.4, time: 0 }, // until the user interacts
};

// Music: put the record on, then dance until the song ends. Songs come from a YouTube playlist, played in shuffle order.
const PLAYLIST_ID = 'PLbd9yHyOxA03B9Y71cDbtGaHKlN3VulgA';
const VINYL_MS = ANIMS.vinyl.speed * 1000; // one pass of the record animation
const SONG_CHECK_MS = 5000; // if the song has not started by then (sound blocked, player not loaded), stop dancing
const SONG_MAX_MS = 15 * 60000; // safety net: never dance longer than this
const NEXT_SONG_MIN = 120000; // the next one starts 2 to 5 minutes later
const NEXT_SONG_RANGE = 180000;
const SLEEP_CHANCE = 0.15; // each time it pauses while idle, the chance it falls asleep instead of walking

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
let songTimer;
let checkTimer;
let nextSongAt = 0;
let player = null;
let playerPromise = null;
let playing = false;
let holdTimer;
let dragged = false;
let startX = 0;
let startY = 0;
let grabX = 0;
let grabY = 0;
let last = 0;

const GRAVITY = 2;
const GROUND_Y = 0;

function loadYouTubeApi() {
  return new Promise(resolve => {
    if (window.YT?.Player) return resolve(window.YT);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    }
  });
}

/** Creates the hidden player once, on first use. */
function ensurePlayer() {
  if (!playerPromise) {
    playerPromise = loadYouTubeApi().then(
      YT =>
        new Promise(ready => {
          const el = document.createElement('div');
          el.style.cssText = 'position:fixed;left:-10px;top:-10px;width:1px;height:1px;opacity:0;pointer-events:none';
          document.body.appendChild(el);
          player = new YT.Player(el, {
            height: '1',
            width: '1',
            playerVars: { listType: 'playlist', list: PLAYLIST_ID, playsinline: 1 },
            events: {
              onReady: () => ready(),
              onStateChange: onPlayerState,
            },
          });
        }),
    );
  }
  return playerPromise;
}

function onPlayerState(e) {
  const S = window.YT.PlayerState;
  if (e.data === S.PLAYING) {
    playing = true;
    clearTimeout(checkTimer);
  }
  if (e.data === S.ENDED && anim.value === 'dance') endSong();
}

function setAnim(name, text = '') {
  if (anim.value === 'dance' && name !== 'dance') {
    player?.pauseVideo?.(); // a tap, a drag or any other animation stops the song
  }
  anim.value = name;
  bubble.value = text;
  target = null;
  clearTimeout(actionTimer);
  clearTimeout(songTimer);
  clearTimeout(checkTimer);
  songTimer = null;
  playing = false;
  const time = ANIMS[name].time;
  if (!time) return;
  actionTimer = setTimeout(() => {
    anim.value = 'idle';
    bubble.value = '';
    pauseUntil = performance.now() + 2000 + Math.random() * 4000;
  }, time);
}

function startSleep() {
  setAnim('sleep');
}

function startSong() {
  nextSongAt = performance.now() + NEXT_SONG_MIN + Math.random() * NEXT_SONG_RANGE;
  setAnim('vinyl', '¡Un poco de música!');
  ensurePlayer().catch(() => {}); // load the player while the record is going on
  songTimer = setTimeout(startDance, VINYL_MS);
}

function startDance() {
  setAnim('dance', '¡Esta me encanta!');
  songTimer = setTimeout(endSong, SONG_MAX_MS);
  ensurePlayer()
    .then(() => {
      if (anim.value !== 'dance') return;
      // Start at a random track. Without a known list length, play from the start of the playlist.
      const count = player.getPlaylist?.()?.length;
      if (count) player.playVideoAt(Math.floor(Math.random() * count));
      else player.playVideo();
      // Browsers block sound until the user has interacted with the page. If the song has not started, stop dancing.
      checkTimer = setTimeout(() => {
        if (!playing) endSong();
      }, SONG_CHECK_MS);
    })
    .catch(endSong);
}

function endSong() {
  setAnim('idle');
  pauseUntil = performance.now() + 2000 + Math.random() * 4000;
}

/** Called when the mascot pauses while idle: it may put on a record, fall asleep, or walk somewhere. */
function chooseIdleAction(now) {
  if (now >= nextSongAt) return startSong();
  if (Math.random() < SLEEP_CHANCE) return startSleep();
  pickTarget();
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
      chooseIdleAction(now);
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

const sprite = computed(() => {
  const a = ANIMS[anim.value];
  const sheet = SHEETS[a.sheet];
  return {
    backgroundImage: `url('${sheet.src}')`,
    backgroundSize: `${sheet.cols * CELL}px ${sheet.rows * CELL}px`,
    backgroundPosition: `0px ${-a.row * CELL}px`,
    '--n': a.frames,
    '--dur': a.speed + 's',
    '--face': face.value,
  };
});

onMounted(() => {
  last = performance.now();
  pauseUntil = last + 2500;
  nextSongAt = last + NEXT_SONG_MIN / 2 + Math.random() * NEXT_SONG_RANGE / 2; // the first song comes sooner
  frameId = requestAnimationFrame(tick);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(frameId);
  clearTimeout(actionTimer);
  clearTimeout(songTimer);
  clearTimeout(checkTimer);
  clearTimeout(holdTimer);
  player?.destroy?.();
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
    <span class="sprite" :style="sprite" />
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
