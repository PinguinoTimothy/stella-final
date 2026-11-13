<script setup>
// The character sheet, filled in on the page itself. It takes the whole screen; one compact bar on top.
// Minimize keeps it in the dock above the bottom bar, so one tap brings it back.
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useSheetsStore } from '../../stores/sheets';
import { drawPage, openDoc, setPageValue, watchForm } from '../../lib/pdfView';

const sheets = useSheetsStore();
const pagesEl = ref(null);
const error = ref('');
// 1 = the page fits the width of the screen. Steps are relative to that.
const ZOOMS = [0.75, 1, 1.25, 1.5, 2, 2.5, 3];
const zoom = ref(1);
const busy = ref(false);

const kinds = computed(() => Object.fromEntries(sheets.schema.map(f => [f.name, f.kind])));

// Only the newest draw is kept: the watcher can fire several times in a row, and overlapping draws would
// clear each other's pages. Drawing is triggered by opening, page changes and zoom, never by typing, so an
// input is not replaced while the user is in it.
let run = 0;
async function draw() {
  if (!sheets.bytes || !pagesEl.value) return;
  const mine = ++run;
  error.value = '';
  try {
    const doc = await openDoc(sheets.bytes);
    if (mine !== run || !pagesEl.value) return;
    pagesEl.value.innerHTML = '';
    const fit = Math.min(pagesEl.value.clientWidth || 360, 1000);
    const width = Math.round(fit * zoom.value);
    watchForm(doc, kinds.value, changes => applyChanges(changes));
    for (let n = 1; n <= doc.numPages; n++) {
      if (mine !== run || !pagesEl.value) return;
      await drawPage(doc, n, pagesEl.value, width, {
        form: true,
        values: sheets.values,
        decimals: sheets.decimals,
        readonly: new Set(Object.keys(sheets.calcs)),
      });
    }
    // a field being typed in stays in view, above the keyboard
    pagesEl.value.addEventListener('focusin', e => {
      const t = e.target;
      if (t && t.closest && t.closest('.annotationLayer') && !t.readOnly)
        t.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  } catch (e) {
    error.value = 'The sheet could not be drawn: ' + (e && e.message ? e.message : e);
  }
}

// Changes made on the page go to the same values the export and the cloud use.
function applyChanges(changes) {
  for (const [name, value] of Object.entries(changes)) {
    if (sheets.values[name] !== value) sheets.setField(name, value);
  }
}

// Automatic fields that changed (because another field changed) are updated on the page in place,
// without redrawing the sheet, so the field being typed in keeps its place.
watch(
  () => sheets.calcTick,
  async () => {
    if (!sheets.bytes || !pagesEl.value) return;
    const doc = await openDoc(sheets.bytes);
    for (const name of sheets.lastCalc) setPageValue(doc, name, sheets.values[name], sheets.decimals);
  },
);

watch(
  () => [sheets.bytes, sheets.panel, zoom.value],
  async ([bytes, panel]) => {
    if (bytes && panel === 'open') {
      await nextTick();
      draw();
    }
  },
);

function zoomStep(dir) {
  const i = ZOOMS.indexOf(zoom.value);
  zoom.value = ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, i + dir))];
}

async function download() {
  busy.value = true;
  try {
    const out = await sheets.exportPdf();
    const url = URL.createObjectURL(new Blob([out], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = (sheets.current?.name || 'sheet') + '.pdf';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } finally {
    busy.value = false;
  }
}

onBeforeUnmount(() => {
  if (pagesEl.value) pagesEl.value.innerHTML = '';
});
</script>

<template>
  <div v-if="sheets.panel === 'open' && sheets.current" class="sheet-view">
    <header class="sp-bar">
      <button class="sp-btn" aria-label="Minimize" title="Minimize" @click="sheets.minimize()">–</button>
      <strong class="sp-t">{{ sheets.current.name }}</strong>
      <span class="sp-st" role="status">
        <template v-if="sheets.status === 'saving'">Saving…</template>
        <template v-else-if="sheets.status === 'saved'">Saved</template>
        <template v-else-if="sheets.status === 'error'">Not saved</template>
      </span>
      <button class="sp-btn" aria-label="Smaller" :disabled="zoom === ZOOMS[0]" @click="zoomStep(-1)">−</button>
      <span class="sp-zoom">{{ Math.round(zoom * 100) }}%</span>
      <button class="sp-btn" aria-label="Larger" :disabled="zoom === ZOOMS[ZOOMS.length - 1]" @click="zoomStep(1)">
        +
      </button>
      <button class="sp-btn sp-dl" aria-label="Download PDF" title="Download PDF" :disabled="busy" @click="download">
        ⇩
      </button>
      <button class="sp-btn" aria-label="Close" title="Close" @click="sheets.close()">×</button>
    </header>

    <div class="sp-body">
      <p v-if="error" class="mute" role="alert">{{ error }}</p>
      <div ref="pagesEl" class="sp-pages"></div>
    </div>
  </div>
</template>

<style>
/* The sheet's own chrome. Named sheet-view (not sp), because sp is the class of every spell row. */
.sheet-view {
  position: fixed;
  inset: 0;
  z-index: 66;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  padding-top: env(safe-area-inset-top, 0px);
}
.sheet-view .sp-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  border-bottom: 1px solid var(--line);
  min-height: 44px;
}
.sheet-view .sp-t {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
}
.sheet-view .sp-st {
  color: var(--mute);
  font-size: 12px;
  white-space: nowrap;
}
.sheet-view .sp-btn {
  min-width: 38px;
  min-height: 38px;
  padding: 0 8px;
  font-size: 18px;
  border-radius: 10px;
}
.sheet-view .sp-btn:disabled {
  opacity: 0.35;
}
.sheet-view .sp-zoom {
  min-width: 42px;
  text-align: center;
  font-size: 13px;
  color: var(--mute);
}
.sheet-view .sp-body {
  flex: 1;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  padding: 4px;
  padding-bottom: calc(4px + env(safe-area-inset-bottom, 0px));
}
</style>
