<script setup>
// A page of the adventure book as it is printed, rendered from the PDF, with its own zoom.
// Starts at the room's page; the arrows move through the book.
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { drawPage, openPdf } from '../../lib/pdfRender'
import { getFile } from '../../lib/mapsDb'

const props = defineProps({
  bookId: { type: String, required: true },
  page: { type: Number, default: 1 },
})
const emit = defineEmits(['page'])

const ZOOMS = [1, 1.25, 1.5, 2, 2.5]
const zoomIdx = ref(1)
const wrap = ref(null)
const canvas = ref(null)
const doc = shallowRef(null)
const pages = ref(0)
const cur = ref(props.page)
const status = ref('Loading page…')
let cancel = null
let observer = null

/** Width the page is drawn at: the column width times the zoom. */
function cssWidth() {
  const base = Math.max(300, (wrap.value?.clientWidth || 600) - 16)
  return base * ZOOMS[zoomIdx.value]
}

async function load() {
  const blob = await getFile(props.bookId)
  if (!blob) { status.value = 'The book is no longer on this device.'; return }
  doc.value = await openPdf(blob)
  pages.value = doc.value.numPages
  status.value = ''
  draw()
}

function draw() {
  if (!doc.value || !canvas.value) return
  cancel?.()
  cancel = drawPage(doc.value, cur.value, canvas.value, cssWidth(), () => {
    status.value = 'This page could not be drawn.'
  }, () => { status.value = '' })
}

function go(delta) {
  const next = cur.value + delta
  if (next >= 1 && next <= pages.value) cur.value = next
}
function zoom(delta) {
  const next = zoomIdx.value + delta
  if (next >= 0 && next < ZOOMS.length) zoomIdx.value = next
}

watch(() => props.page, (p) => { cur.value = p })
watch([cur, zoomIdx], draw)
watch(cur, (p) => emit('page', p), { immediate: true })

onMounted(() => {
  observer = new ResizeObserver(() => draw())
  if (wrap.value) observer.observe(wrap.value)
  load().catch(() => { status.value = 'Could not open the book.' })
})
onBeforeUnmount(() => {
  observer?.disconnect()
  cancel?.()
  doc.value?.destroy()
})
</script>

<template>
  <div class="bp">
    <div class="bp-bar">
      <button type="button" class="bp-btn" :disabled="cur <= 1" aria-label="Previous book page" @click="go(-1)">‹</button>
      <span class="bp-count">Book page {{ cur }}<template v-if="pages"> / {{ pages }}</template></span>
      <button type="button" class="bp-btn" :disabled="cur >= pages" aria-label="Next book page" @click="go(1)">›</button>
      <span class="bp-sep"></span>
      <button type="button" class="bp-btn" :disabled="zoomIdx === 0" aria-label="Zoom out text" @click="zoom(-1)">−</button>
      <span class="bp-zoom">{{ ZOOMS[zoomIdx] * 100 }}%</span>
      <button type="button" class="bp-btn" :disabled="zoomIdx === ZOOMS.length - 1" aria-label="Zoom in text" @click="zoom(1)">+</button>
    </div>
    <div ref="wrap" class="bp-scroll">
      <p v-if="status" class="bp-status">{{ status }}</p>
      <canvas v-show="!status" ref="canvas" class="bp-canvas"></canvas>
    </div>
  </div>
</template>

<style scoped>
.bp { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.bp-bar { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding-bottom: 8px; }
.bp-count, .bp-zoom { font-size: 13px; color: var(--mute); font-variant-numeric: tabular-nums; }
.bp-zoom { min-width: 48px; text-align: center; }
.bp-sep { flex: 1; }
.bp-btn { min-width: 36px; min-height: 36px; font-size: 18px; line-height: 1; border-radius: 10px; cursor: pointer; }
.bp-btn:disabled { opacity: .4; cursor: default; }
.bp-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 8px;
  text-align: center;
  background: #05090d;
  border-radius: 10px;
}
.bp-canvas { display: inline-block; background: #fff; box-shadow: 0 4px 14px rgba(0, 0, 0, .35); }
.bp-status { color: var(--mute); font-size: 13px; }
</style>
