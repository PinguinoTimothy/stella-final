<script setup>
// The character sheet, filled in on the page itself, like the PDF in any reader.
// Minimize keeps it in the dock above the bottom bar; one tap brings it back, without leaving the current screen.
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useSheetsStore } from '../../stores/sheets';
import { drawPage, openDoc, setPageValue, watchForm } from '../../lib/pdfView';

const sheets = useSheetsStore();
const pagesEl = ref(null);
const error = ref('');
const zoom = ref(2);
const ZOOMS = [1.5, 2, 2.5, 3];
const focused = ref(null); // { name, label } of the field being typed in
const busy = ref(false);

const kinds = computed(() => Object.fromEntries(sheets.schema.map(f => [f.name, f.kind])));

// Only the newest draw is kept: the watcher can fire several times in a row, and overlapping draws would
// clear each other's pages. Drawing is triggered by opening, page changes and zoom, never by typing, so an
// input is not replaced while the user is in it.
let run = 0;
function onFocusIn(e) {
  const t = e.target;
  if (!t || !t.closest || !t.closest('.annotationLayer') || !t.name || t.readOnly) return;
  focused.value = { name: t.name, label: t.name.replace(/^[^_]+_/, '').replace(/_/g, ' ') };
}
function onFocusOut(e) {
  const t = e.target;
  if (t && t.name && focused.value && t.name === focused.value.name) setTimeout(() => (focused.value = null), 150);
}
// typing in the bar goes to the field on the page, which then saves it like any other change
function typeInBar(e) {
  const name = focused.value && focused.value.name;
  const el = name && pagesEl.value && pagesEl.value.querySelector(`.annotationLayer input[name="${CSS.escape(name)}"]`);
  if (!el) return;
  el.value = e.target.value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

async function draw() {
  if (!sheets.bytes || !pagesEl.value) return;
  const mine = ++run;
  error.value = '';
  try {
    const doc = await openDoc(sheets.bytes);
    if (mine !== run || !pagesEl.value) return;
    pagesEl.value.innerHTML = '';
    const fit = Math.min(pagesEl.value.clientWidth || 360, 900);
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
    pagesEl.value.addEventListener('focusin', onFocusIn);
    pagesEl.value.addEventListener('focusout', onFocusOut);
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
  const next = ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, i + dir))];
  zoom.value = next;
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
  <div v-if="sheets.panel === 'open' && sheets.current" class="sp-bd" @click.self="sheets.minimize()">
    <section class="sp" role="dialog" aria-modal="false" :aria-label="sheets.current.name">
      <header class="sp-h">
        <strong class="sp-t">{{ sheets.current.name }}</strong>
        <span class="sp-st" role="status">
          <template v-if="sheets.status === 'saving'">Saving…</template>
          <template v-else-if="sheets.status === 'saved'">Saved</template>
          <template v-else-if="sheets.status === 'error'">Not saved yet. Will retry.</template>
        </span>
        <button class="sp-btn" aria-label="Minimize" title="Minimize" @click="sheets.minimize()">–</button>
        <button class="sp-btn" aria-label="Close" title="Close" @click="sheets.close()">×</button>
      </header>

      <nav class="sp-tabs">
        <button aria-label="Smaller" :disabled="zoom === ZOOMS[0]" @click="zoomStep(-1)">−</button>
        <span class="sp-zoom mute">{{ Math.round(zoom * 100) }}%</span>
        <button aria-label="Larger" :disabled="zoom === ZOOMS[ZOOMS.length - 1]" @click="zoomStep(1)">+</button>
        <button class="sp-dl" :disabled="busy" @click="download">Download PDF</button>
      </nav>

      <div class="sp-body">
        <p v-if="error" class="mute" role="alert">{{ error }}</p>
        <div ref="pagesEl" class="sp-pages"></div>
      </div>

      <div v-if="focused" class="sp-focus">
        <label :for="'sp-bar-' + focused.name">{{ focused.label }}</label>
        <input :id="'sp-bar-' + focused.name" :value="sheets.values[focused.name] ?? ''" type="text" autocomplete="off" @input="typeInBar">
      </div>
    </section>
  </div>
</template>
