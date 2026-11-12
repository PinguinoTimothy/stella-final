// Draws a PDF with pdf.js, including its fillable fields, so the sheet can be filled in on the page itself.
// Each page is a canvas (the picture) plus pdf.js's form layer (the real inputs, placed over the fields).
let pdfjs;
async function lib() {
  if (!pdfjs) {
    pdfjs = await import('pdfjs-dist');
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    await import('pdfjs-dist/web/pdf_viewer.css');
  }
  return pdfjs;
}

let cache = { bytes: null, doc: null };
/** Opens a document once per byte array. */
export async function openDoc(bytes) {
  if (cache.bytes === bytes && cache.doc) return cache.doc;
  const p = await lib();
  if (cache.doc) cache.doc.destroy();
  const doc = await p.getDocument({ data: bytes.slice(0) }).promise;
  doc.pfNames = new Map(); // annotation id -> field name, filled as pages are drawn
  cache = { bytes, doc };
  return doc;
}

// The form layer asks a link service for some things; links are not used in a character sheet.
const linkService = {
  externalLinkEnabled: false,
  getDestinationHash: () => '#',
  getAnchorUrl: () => '#',
  addLinkAttributes(link, url) {
    link.href = url || '#';
  },
  executeNamedAction() {},
  executeSetOCGState() {},
  goToDestination() {},
  goToPage() {},
  isPageVisible: () => true,
  isPageCached: () => true,
  cachePageRef() {},
  get pagesCount() {
    return 0;
  },
  get pageRotation() {
    return 0;
  },
};

/**
 * Draws page `n` into `container` at `width` CSS pixels.
 * With `form`, the page's fields become real inputs holding `values` (name -> value).
 */
export async function drawPage(doc, n, container, width, { form = false, values = {}, decimals = {}, readonly = new Set() } = {}) {
  const p = await lib();
  const page = await doc.getPage(n);
  const base = page.getViewport({ scale: 1 });
  const scale = width / base.width;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssVp = page.getViewport({ scale });
  const drawVp = page.getViewport({ scale: scale * dpr });

  const wrap = document.createElement('div');
  wrap.className = 'sp-page-wrap';
  wrap.style.width = cssVp.width + 'px';
  wrap.style.height = cssVp.height + 'px';
  const canvas = document.createElement('canvas');
  canvas.className = 'sp-page';
  canvas.width = Math.floor(drawVp.width);
  canvas.height = Math.floor(drawVp.height);
  canvas.style.width = cssVp.width + 'px';
  canvas.style.height = cssVp.height + 'px';
  wrap.appendChild(canvas);
  container.appendChild(wrap);
  // the picture of the page only: the fields are drawn once, by the form layer below (not twice)
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: drawVp, annotationMode: p.AnnotationMode.DISABLE }).promise;
  if (!form) return;

  const annotations = await page.getAnnotations({ intent: 'display' });
  const storage = doc.annotationStorage;
  for (const a of annotations) {
    if (!a.fieldName) continue;
    doc.pfNames.set(a.id, a.fieldName);
    if (values[a.fieldName] !== undefined && values[a.fieldName] !== null) {
      const v = values[a.fieldName];
      storage.setValue(a.id, typeof v === 'boolean' ? { value: v } : { value: String(v), formattedValue: formatValue(v, decimals[a.fieldName]) });
    }
  }
  // widgets without a field name are not part of the sheet (pdf.js would still draw them as empty inputs)
  const shown = annotations.filter(a => a.subtype !== 'Widget' || a.fieldName);
  const layer = document.createElement('div');
  layer.className = 'annotationLayer';
  layer.style.width = cssVp.width + 'px';
  layer.style.height = cssVp.height + 'px';
  // pdf.js sizes and places the fields with this variable; without it they land in the corner
  layer.style.setProperty('--scale-factor', String(scale));
  wrap.appendChild(layer);
  const layerVp = page.getViewport({ scale, dontFlip: true });
  const fieldObjects = await doc.getFieldObjects();
  const layerDone = new p.AnnotationLayer({
    div: layer,
    accessibilityManager: null,
    annotationCanvasMap: null,
    annotationEditorUIManager: null,
    page,
    viewport: layerVp,
  }).render({
    viewport: layerVp,
    div: layer,
    annotations: shown,
    page,
    linkService,
    annotationStorage: storage,
    renderForms: true,
    fieldObjects,
    enableScripting: false,
    hasJSActions: false,
    imageResourcesPath: '',
  });
  await layerDone;
  // automatic fields are shown, not typed into
  // pdf.js hides the input of a calculated field (it expects its own script engine to show it), so show it here
  layer.querySelectorAll('input, select, textarea').forEach(el => {
    if (readonly.has(el.name)) {
      el.hidden = false;
      el.disabled = false;
      el.readOnly = true;
      el.tabIndex = -1;
    }
  });
}

/** How a value is shown: numbers with the field's number of decimals, the rest as they are. */
export function formatValue(value, decimals) {
  if (decimals !== undefined && value !== '' && value != null && Number.isFinite(Number(value))) return Number(value).toFixed(decimals);
  return value == null ? '' : String(value);
}

/** Sets an automatic field's value on the page (and the input that shows it) without touching the others. */
export function setPageValue(doc, name, value, decimals = {}) {
  const storage = doc.annotationStorage;
  const isBox = typeof value === 'boolean';
  const shown = isBox ? '' : formatValue(value, decimals[name]);
  const raw = isBox ? (value ? 'Yes' : 'Off') : String(value ?? '');
  for (const [id, n] of doc.pfNames) {
    if (n === name) storage.setValue(id, { value: raw, formattedValue: shown || raw });
  }
  if (isBox) {
    document.querySelectorAll(`.annotationLayer [name="${CSS.escape(name)}"]`).forEach(el => {
      el.checked = value;
    });
    return;
  }
  document.querySelectorAll(`.annotationLayer [name="${CSS.escape(name)}"]`).forEach(el => {
    el.value = shown;
  });
}

/**
 * Calls `onChange({ fieldName: value })` for every field the user changes on the page.
 * pdf.js reports a change only the first time (onSetModified), so every write to the storage is observed here.
 * `kinds` tells checkboxes apart: their values are normalized to true/false.
 */
export function watchForm(doc, kinds, onChange) {
  const storage = doc.annotationStorage;
  if (storage.pfWatched) return;
  storage.pfWatched = true;
  const write = storage.setValue.bind(storage);
  storage.setValue = (key, entry) => {
    // pdf.js shows formattedValue when it is set, and otherwise the text printed in the PDF: keep both in step
    const name0 = doc.pfNames.get(key);
    if (name0 && entry && typeof entry === 'object' && typeof entry.value === 'string') entry = { ...entry, formattedValue: entry.value };
    write(key, entry);
    const name = doc.pfNames.get(key);
    if (!name) return;
    const raw = entry && typeof entry === 'object' && 'value' in entry ? entry.value : entry;
    const value =
      kinds[name] === 'check'
        ? raw === true || (typeof raw === 'string' && raw !== '' && raw !== 'Off')
        : raw == null ? '' : String(raw);
    onChange({ [name]: value });
  };
}
