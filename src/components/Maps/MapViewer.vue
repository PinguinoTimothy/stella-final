<script setup>
// One adventure: the book read like a PDF (selectable text) with the map as a floating window on top.
// Without a book, the map fills the screen. Without a map, only the book.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { drawPage, openPdf } from '../../lib/pdfRender'
import { getFile } from '../../lib/mapsDb'
import BookReader from './BookPages.vue'

const props = defineProps({
  title: { type: String, default: '' },
  book: { type: Object, default: null },
  map: { type: Object, default: null },
})
const emit = defineEmits(['close'])

const ZOOMS = [1, 1.5, 2, 3]
const hasBook = computed(() => !!props.book)
const hasMap = computed(() => !!props.map)
const mapFull = computed(() => hasMap.value && !hasBook.value)
const showMap = ref(false)

// The map
const stage = ref(null)
const canvas = ref(null)
// shallowRef: pdf.js uses private fields, which break behind Vue's reactive proxy.
const doc = shallowRef(null)
const pages = ref(0)
const page = ref(1)
const zoomIdx = ref(1)                         // 150 % to start
const status = ref(hasMap.value ? 'Loading…' : '')
const box = ref({ w: 600, h: 500 })
let cancelDraw = null
let drawToken = 0
let observer = null

function measure() {
  if (!stage.value) return
  const w = Math.min(stage.value.clientWidth - 16, window.innerWidth)
  const h = Math.min(stage.value.clientHeight - 16, window.innerHeight)
  box.value = {
    w: Number.isFinite(w) ? Math.max(200, w) : 600,
    h: Number.isFinite(h) ? Math.max(200, h) : 500,
  }
}

async function load() {
  if (!props.map) return
  status.value = 'Loading…'
  const blob = await getFile(props.map.id)
  if (!blob) { status.value = 'This map is no longer on this device.'; return }
  doc.value = await openPdf(blob)
  pages.value = doc.value.numPages
  page.value = 1
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
  if (!Number.isFinite(css) || css <= 0) return
  cancelDraw = drawPage(doc.value, page.value, canvas.value, css, (e) => {
    console.error('Map page could not be drawn:', e)
    status.value = 'This page could not be drawn. Try a smaller zoom.'
  })
  stage.value?.scrollTo({ top: 0, left: 0 })
}

// Drag to move the map: hold the pointer (or finger) on the map and move it, instead of the scroll bars.
let pan = null
function onPanStart(e) {
  if (!stage.value || (e.pointerType === 'mouse' && e.button !== 0)) return
  pan = { id: e.pointerId, x: e.clientX, y: e.clientY, left: stage.value.scrollLeft, top: stage.value.scrollTop }
  stage.value.setPointerCapture(e.pointerId)
  stage.value.classList.add('is-panning')
}
function onPanMove(e) {
  if (!pan || pan.id !== e.pointerId || !stage.value) return
  stage.value.scrollLeft = pan.left - (e.clientX - pan.x)
  stage.value.scrollTop = pan.top - (e.clientY - pan.y)
}
function onPanEnd(e) {
  if (!pan || pan.id !== e.pointerId) return
  pan = null
  stage.value?.classList.remove('is-panning')
}

function go(delta) {
  const next = page.value + delta
  if (next >= 1 && next <= pages.value) page.value = next
}
function zoom(delta) {
  const next = zoomIdx.value + delta
  if (next >= 0 && next < ZOOMS.length) zoomIdx.value = next
}

watch([page, zoomIdx, box], draw, { deep: true })

// The map window comes and goes: when it appears, it measures and draws again.
watch(stage, (el) => {
  observer?.disconnect()
  if (el) { observer?.observe(el); measure(); draw() }
}, { flush: 'post' })

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
  <div class="mv" role="dialog" aria-modal="true" :aria-label="title">
    <header class="mv-bar">
      <button type="button" class="mv-btn" aria-label="Close" @click="emit('close')">×</button>
      <strong class="mv-title">{{ title }}</strong>
      <button v-if="hasBook && hasMap" type="button" class="mv-mapbtn" :aria-pressed="showMap" @click="showMap = !showMap">
        {{ showMap ? 'Hide map' : 'Map' }}
      </button>
    </header>

    <div class="mv-body">
      <section v-if="hasBook" class="mv-reader">
        <BookReader :key="book.id" :book-id="book.id" />
      </section>

      <div v-if="hasMap && (mapFull || showMap)" :class="mapFull ? 'mv-map-full' : 'mv-map-float'">
        <div
          ref="stage"
          class="mv-stage"
          @pointerdown="onPanStart"
          @pointermove="onPanMove"
          @pointerup="onPanEnd"
          @pointercancel="onPanEnd"
        >
          <p v-if="status" class="mv-status">{{ status }}</p>
          <div v-show="!status" class="mv-page">
            <canvas ref="canvas" class="mv-canvas"></canvas>
          </div>
        </div>

        <footer class="mv-bar mv-foot">
          <button type="button" class="mv-btn" :disabled="page <= 1" aria-label="Previous map page" @click="go(-1)">‹</button>
          <button type="button" class="mv-btn" :disabled="zoomIdx === 0" aria-label="Zoom out map" @click="zoom(-1)">−</button>
          <span class="mv-zoom">{{ ZOOMS[zoomIdx] * 100 }}%</span>
          <button type="button" class="mv-btn" :disabled="zoomIdx === ZOOMS.length - 1" aria-label="Zoom in map" @click="zoom(1)">+</button>
          <button type="button" class="mv-btn" :disabled="page >= pages" aria-label="Next map page" @click="go(1)">›</button>
        </footer>
      </div>
    </div>
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
  padding: 8px 14px;
  border-bottom: 1px solid var(--line);
}
.mv-foot {
  justify-content: center;
  border-top: 1px solid var(--line);
  border-bottom: 0;
}
.mv-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mv-zoom { font-size: 14px; color: var(--mute); font-variant-numeric: tabular-nums; min-width: 56px; text-align: center; }
.mv-btn {
  min-width: 40px;
  min-height: 40px;
  font-size: 20px;
  line-height: 1;
  border-radius: 10px;
  cursor: pointer;
}
.mv-btn:disabled { opacity: .4; cursor: default; }
.mv-btn:focus-visible { outline: 2px solid var(--acc); outline-offset: 2px; }
.mv-mapbtn { min-height: 36px; padding: 0 14px; border-radius: 10px; font-size: 14px; cursor: pointer; }
.mv-mapbtn[aria-pressed="true"] { border-color: var(--acc); color: var(--acc); }

.mv-body { position: relative; flex: 1; min-height: 0; display: flex; }
.mv-reader { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; }

/* The map as a window over the book. */
.mv-map-float {
  position: absolute;
  right: 16px;
  bottom: 16px;
  width: min(46vw, 680px);
  height: 68vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: 0 14px 34px rgba(0, 0, 0, .5);
  z-index: 6;
}
.mv-map-full { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.mv-map-full .mv-stage, .mv-map-float .mv-stage { flex: 1; min-height: 0; }

.mv-stage {
  overflow: auto;
  padding: 8px;
  text-align: center;
  background: #05090d;
}
.mv-page { position: relative; display: inline-block; line-height: 0; }
.mv-canvas {
  display: block;
  max-width: none;
  background: #fff;
  box-shadow: 0 6px 20px rgba(0, 0, 0, .4);
}
.mv-stage { cursor: grab; touch-action: none; }
.mv-stage.is-panning { cursor: grabbing; user-select: none; }
.mv-status { color: var(--mute); padding: 40px 0; }
</style>
