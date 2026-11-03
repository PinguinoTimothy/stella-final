<script setup>
// The adventure book read like a PDF reader: pages one after another, drawn as they come into view,
// at a comfortable reading width and centred on a grey background. Tells the parent which page is on screen.
import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { TextLayer } from 'pdfjs-dist'
import 'pdfjs-dist/web/pdf_viewer.css'
import { drawPage, openPdf } from '../../lib/pdfRender'
import { getFile } from '../../lib/mapsDb'

const props = defineProps({
  bookId: { type: String, required: true },
  page: { type: Number, default: 1 },
})
const emit = defineEmits(['page'])

const ZOOMS = [0.8, 1, 1.25, 1.5]
const zoomIdx = ref(1)
const scroller = ref(null)
const doc = shallowRef(null)
const count = ref(0)
const current = ref(props.page)
const status = ref('Loading…')
const pageW = ref(700)
const pageH = ref(906)
const pageEls = new Map()
const drawn = new Map()          // page → width it was drawn at
const cancels = new Map()
let observer = null

/** Reading width: the column, at most 820 px, never wider than the window. */
function baseWidth() {
  const column = (scroller.value?.clientWidth || 800) - 40
  return Math.max(320, Math.min(820, column, window.innerWidth - 60))
}
function layout() {
  pageW.value = Math.round(baseWidth() * ZOOMS[zoomIdx.value])
  pageH.value = Math.round(pageW.value * 1.294)   // letter; corrected when the page is drawn
}

function setEl(n, el) {
  if (el) { pageEls.set(n, el); observer?.observe(el) }
  else pageEls.delete(n)
}

function draw(n) {
  const el = pageEls.get(n)
  if (!doc.value || !el) return
  if (drawn.get(n) === pageW.value) return
  cancels.get(n)?.()
  const canvas = el.querySelector('canvas')
  const cancel = drawPage(doc.value, n, canvas, pageW.value, () => {
    status.value = `Page ${n} could not be drawn.`
  }, () => { drawn.set(n, pageW.value); drawText(n) })
  cancels.set(n, cancel)
}

/** The page's text, as a transparent layer over the picture: it can be selected and copied. */
async function drawText(n) {
  const el = pageEls.get(n)
  const layer = el?.querySelector('.textLayer')
  if (!doc.value || !layer) return
  layer.innerHTML = ''
  const page = await doc.value.getPage(n)
  const base = page.getViewport({ scale: 1 })
  const vp = page.getViewport({ scale: pageW.value / base.width })
  const textLayer = new TextLayer({
    textContentSource: await page.getTextContent(),
    container: layer,
    viewport: vp,
  })
  await textLayer.render()
}

/** Draws the pages that are on screen or close to it. */
function drawNear() {
  if (!scroller.value) return
  const box = scroller.value.getBoundingClientRect()
  for (const [n, el] of pageEls) {
    const r = el.getBoundingClientRect()
    if (r.bottom > box.top - 800 && r.top < box.bottom + 800) draw(n)
  }
}

/** The page most of the screen shows, reported to the parent. */
let scrollTimer = 0
function onScroll() {
  if (scrollTimer) return
  scrollTimer = requestAnimationFrame(() => {
    scrollTimer = 0
    if (!scroller.value) return
    const box = scroller.value.getBoundingClientRect()
    const mid = box.top + box.height / 2
    let best = current.value, bestDist = Infinity
    for (const [n, el] of pageEls) {
      const r = el.getBoundingClientRect()
      const d = Math.abs((r.top + r.bottom) / 2 - mid)
      if (d < bestDist) { bestDist = d; best = n }
    }
    if (best !== current.value) { current.value = best; emit('page', best) }
    drawNear()
  })
}

function goToPage(n) {
  const el = pageEls.get(n)
  if (!el || !scroller.value) return
  scroller.value.scrollTop = el.offsetTop - 12
  current.value = n
  drawNear()
}

function zoom(delta) {
  const next = zoomIdx.value + delta
  if (next < 0 || next >= ZOOMS.length) return
  zoomIdx.value = next
}

async function load() {
  const blob = await getFile(props.bookId)
  if (!blob) { status.value = 'The book is no longer on this device.'; return }
  doc.value = await openPdf(blob)
  count.value = doc.value.numPages
  status.value = ''
  layout()
  await nextTick()
  goToPage(Math.min(Math.max(1, props.page), count.value))
  drawNear()
}

watch(() => props.page, (p) => { if (p !== current.value) goToPage(p) })
watch(zoomIdx, async () => {
  const keep = current.value
  layout()
  drawn.clear()
  await nextTick()
  goToPage(keep)
  drawNear()
})

let resizeTimer = 0
function onResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    const before = pageW.value
    layout()
    if (pageW.value !== before) { drawn.clear(); nextTick(() => drawNear()) }
  }, 150)
}

onMounted(() => {
  observer = new IntersectionObserver(() => drawNear(), { root: scroller.value, rootMargin: '800px 0px' })
  for (const el of pageEls.values()) observer.observe(el)
  window.addEventListener('resize', onResize)
  load().catch(() => { status.value = 'Could not open the book.' })
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  observer?.disconnect()
  cancels.forEach((c) => c?.())
  doc.value?.destroy()
})
</script>

<template>
  <div class="rd">
    <div class="rd-bar">
      <span class="rd-count">Page {{ current }}<template v-if="count"> of {{ count }}</template></span>
      <span class="rd-sep"></span>
      <button type="button" class="rd-btn" :disabled="zoomIdx === 0" aria-label="Smaller" @click="zoom(-1)">−</button>
      <span class="rd-zoom">{{ Math.round(ZOOMS[zoomIdx] * 100) }}%</span>
      <button type="button" class="rd-btn" :disabled="zoomIdx === ZOOMS.length - 1" aria-label="Larger" @click="zoom(1)">+</button>
    </div>
    <p v-if="status" class="rd-status">{{ status }}</p>
    <div ref="scroller" class="rd-scroll" @scroll.passive="onScroll">
      <div
        v-for="n in count"
        :key="n"
        :ref="(el) => setEl(n, el)"
        class="rd-page"
        :style="{ width: pageW + 'px', height: pageH + 'px' }"
      >
        <canvas class="rd-canvas"></canvas>
        <div class="textLayer"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rd { display: flex; flex-direction: column; flex: 1; min-height: 0; min-width: 0; }
.rd-bar { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-bottom: 1px solid var(--line); }
.rd-count, .rd-zoom { font-size: 13px; color: var(--mute); font-variant-numeric: tabular-nums; }
.rd-zoom { min-width: 46px; text-align: center; }
.rd-sep { flex: 1; }
.rd-btn { min-width: 34px; min-height: 34px; font-size: 18px; line-height: 1; border-radius: 9px; cursor: pointer; }
.rd-btn:disabled { opacity: .4; cursor: default; }
.rd-status { margin: 0; padding: 12px; color: var(--mute); font-size: 13px; }
.rd-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 18px 0 40px;
  background: #2b3036;
}
.rd-page {
  flex: none;
  background: #fff;
  box-shadow: 0 6px 22px rgba(0, 0, 0, .45);
  position: relative;
}
.rd-canvas { display: block; }
.rd-page .textLayer { position: absolute; inset: 0; }
</style>
