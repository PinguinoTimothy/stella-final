<script setup>
// Full-screen map viewer for one stored PDF. At 100 % the whole page fits on the screen.
// Rooms: pick one from the list and the viewer goes to its page and marks it on the map.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { drawPage, openPdf } from '../../lib/pdfRender'
import { getFile } from '../../lib/mapsDb'
import EncounterPanel from './EncounterPanel.vue'

const props = defineProps({
  map: { type: Object, required: true },
  title: { type: String, default: '' },
  page: { type: Number, default: 1 },
  rooms: { type: Array, default: () => [] },   // [{ code, page, fx, fy }] fx, fy: fractions of the page
  encounters: { type: Object, default: () => ({}) }, // code → encounter, from the adventure book
})
const emit = defineEmits(['close'])

const ZOOMS = [1, 1.5, 2, 3]
const stage = ref(null)
const canvas = ref(null)
// shallowRef: pdf.js uses private fields, which break behind Vue's reactive proxy.
const doc = shallowRef(null)
const pages = ref(0)
const page = ref(1)
const zoomIdx = ref(0)
const status = ref('Loading map…')
const box = ref({ w: 360, h: 500 })
const marker = ref(null)      // the room being shown
const roomPick = ref('')
let cancelDraw = null
let drawToken = 0
let observer = null

const visibleMarker = computed(() => (marker.value && marker.value.page === page.value ? marker.value : null))
// The encounter of the room being shown, if the book has it.
const encounter = computed(() => (marker.value ? props.encounters[marker.value.code] || null : null))

function measure() {
  if (!stage.value) return
  box.value = {
    w: Math.max(200, stage.value.clientWidth - 16),
    h: Math.max(200, stage.value.clientHeight - 16),
  }
}

async function load() {
  status.value = 'Loading map…'
  const blob = await getFile(props.map.id)
  if (!blob) { status.value = 'This map is no longer on this device.'; return }
  doc.value = await openPdf(blob)
  pages.value = doc.value.numPages
  page.value = Math.min(Math.max(1, props.page), pages.value)
  status.value = ''
  await draw()
}

async function draw() {
  if (!doc.value || !canvas.value) return
  const token = ++drawToken
  cancelDraw?.()
  status.value = ''
  const pdfPage = await doc.value.getPage(page.value)
  if (token !== drawToken) return
  // Fit the whole page in the box: the smaller of width and height decides the size at 100 %.
  const [x0, y0, x1, y1] = pdfPage.view
  const ratio = (x1 - x0) / (y1 - y0)
  const fitWidth = Math.min(box.value.w, box.value.h * ratio)
  const css = fitWidth * ZOOMS[zoomIdx.value]
  cancelDraw = drawPage(
    doc.value, page.value, canvas.value, css,
    (e) => {
      console.error('Map page could not be drawn:', e)
      status.value = 'This page could not be drawn. Try a smaller zoom.'
    },
    () => { if (visibleMarker.value) focusMarker() },
  )
  if (!visibleMarker.value) stage.value?.scrollTo({ top: 0, left: 0 })
}

/** Scrolls the stage so the marked room is in the middle of the screen. */
async function focusMarker() {
  await nextTick()
  const el = stage.value?.querySelector('.mv-marker')
  if (!el || !stage.value) return
  const s = stage.value.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  stage.value.scrollBy({
    left: r.left - s.left - s.width / 2,
    top: r.top - s.top - s.height / 2,
    behavior: 'smooth',
  })
}

function pickRoom(value) {
  const r = props.rooms[Number(value)]
  roomPick.value = ''
  if (!r) return
  marker.value = r
  if (r.page && r.page !== page.value) page.value = r.page
  else focusMarker()
}

function go(delta) {
  const next = page.value + delta
  if (next >= 1 && next <= pages.value) { marker.value = null; page.value = next }
}
function zoom(delta) {
  const next = zoomIdx.value + delta
  if (next >= 0 && next < ZOOMS.length) zoomIdx.value = next
}

watch([page, zoomIdx, box], draw, { deep: true })

onMounted(() => {
  measure()
  observer = new ResizeObserver(measure)
  if (stage.value) observer.observe(stage.value)
  load().catch(() => { status.value = 'Could not open this PDF.' })
})
onBeforeUnmount(() => {
  observer?.disconnect()
  cancelDraw?.()
  doc.value?.destroy()
})
</script>

<template>
  <div class="mv" role="dialog" aria-modal="true" :aria-label="title || map.name">
    <header class="mv-bar">
      <button type="button" class="mv-btn" aria-label="Close map" @click="emit('close')">×</button>
      <div class="mv-heading">
        <strong class="mv-title">{{ title || map.name }}</strong>
        <span v-if="title" class="mv-sub">{{ map.name }}</span>
      </div>
      <span class="mv-count" v-if="pages">{{ page }} / {{ pages }}</span>
    </header>

    <div v-if="rooms.length" class="mv-rooms">
      <select :value="roomPick" aria-label="Go to room" @change="pickRoom($event.target.value)">
        <option value="" disabled>Go to room…</option>
        <option v-for="(r, i) in rooms" :key="i" :value="i">
          {{ r.code }}<template v-if="r.page && r.page !== page"> · page {{ r.page }}</template>
        </option>
      </select>
    </div>

    <div ref="stage" class="mv-stage">
      <p v-if="status" class="mv-status">{{ status }}</p>
      <div v-show="!status" class="mv-page">
        <canvas ref="canvas" class="mv-canvas"></canvas>
        <div
          v-if="visibleMarker"
          class="mv-marker"
          :style="{ left: visibleMarker.fx * 100 + '%', top: visibleMarker.fy * 100 + '%' }"
        ><span>{{ visibleMarker.code }}</span></div>
      </div>
    </div>

    <EncounterPanel v-if="encounter" :key="encounter.code" :room="encounter" class="mv-enc" />

    <footer class="mv-bar mv-foot">
      <button type="button" class="mv-btn" :disabled="page <= 1" aria-label="Previous page" @click="go(-1)">‹</button>
      <button type="button" class="mv-btn" :disabled="zoomIdx === 0" aria-label="Zoom out" @click="zoom(-1)">−</button>
      <span class="mv-zoom">{{ ZOOMS[zoomIdx] * 100 }}%</span>
      <button type="button" class="mv-btn" :disabled="zoomIdx === ZOOMS.length - 1" aria-label="Zoom in" @click="zoom(1)">+</button>
      <button type="button" class="mv-btn" :disabled="page >= pages" aria-label="Next page" @click="go(1)">›</button>
    </footer>
  </div>
</template>

<style scoped>
.mv {
  position: fixed;
  inset: 0;
  z-index: 55;
  display: flex;
  flex-direction: column;
  background: var(--bg, #0a141c);
  color: var(--ink, #e8f4f1);
}
.mv-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: calc(8px + env(safe-area-inset-top, 0px)) 12px 8px;
  border-bottom: 1px solid var(--line);
}
.mv-foot {
  justify-content: center;
  border-top: 1px solid var(--line);
  border-bottom: 0;
  padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
}
.mv-heading { flex: 1; min-width: 0; display: grid; }
.mv-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mv-sub { font-size: 12px; color: var(--mute); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mv-count, .mv-zoom { font-size: 14px; color: var(--mute); font-variant-numeric: tabular-nums; min-width: 56px; text-align: center; }
.mv-btn {
  min-width: 44px;
  min-height: 44px;
  font-size: 20px;
  line-height: 1;
  border-radius: 12px;
  cursor: pointer;
}
.mv-btn:disabled { opacity: .4; cursor: default; }
.mv-btn:focus-visible { outline: 2px solid var(--acc); outline-offset: 2px; }

.mv-rooms { padding: 8px 12px 0; }
.mv-rooms select {
  width: 100%;
  min-height: 44px;
  border-radius: 12px;
}

.mv-stage {
  flex: 1;
  min-height: 0;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  padding: 8px;
  text-align: center;
  background: #05090d;
}
.mv-page {
  position: relative;
  display: inline-block;
  line-height: 0;
}
.mv-canvas {
  display: block;
  max-width: none;
  background: #fff;
  box-shadow: 0 6px 20px rgba(0, 0, 0, .4);
}
.mv-marker {
  position: absolute;
  width: 26px;
  height: 26px;
  transform: translate(-50%, -50%);
  border: 3px solid #ffd37a;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgba(0, 0, 0, .45);
  pointer-events: none;
}
.mv-marker span {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translate(-50%, -6px);
  padding: 2px 7px;
  border-radius: 6px;
  background: rgba(0, 0, 0, .78);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
  white-space: nowrap;
}
.mv-status { color: var(--mute); padding: 40px 0; }
.mv-enc { max-height: 42vh; overflow: auto; flex: none; }
</style>
