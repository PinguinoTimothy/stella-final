// Character sheets: the PDF (in Storage) plus the values of its fields (in the sheets table).
// The viewer and the editor read the same values. Edits are saved after a short pause, and kept on the device until they are.
import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import { useCloudStore } from './cloud';
import * as api from '../lib/sheetApi';
import { fillPdf, readFields } from '../lib/sheet';
import { recalc } from '../lib/sheetCalc';
import { uid } from '../lib/format';

const OPEN_KEY = 'pf1e-sheet-open';
const pendingKey = id => `pf1e-sheet-pending-${id}`;
const readPending = id => {
  try {
    return JSON.parse(localStorage.getItem(pendingKey(id)) || '{}');
  } catch {
    return {};
  }
};

export const useSheetsStore = defineStore('sheets', () => {
  const cloud = useCloudStore();
  const list = ref([]); // [{ id, name, storage_path, fields, updated_at }]
  const error = ref('');
  const currentId = ref(localStorage.getItem(OPEN_KEY) || '');
  const panel = ref('closed'); // 'closed' | 'open' | 'min'
  const schema = ref([]); // the sheet's editable fields: name, kind, group, options
  const values = reactive({}); // current value of every field
  const bytes = ref(null); // the PDF of the open sheet
  const calcs = ref({}); // automatic fields: name -> their script from the PDF
  const decimals = ref({}); // how many decimals each number field shows
  const calcTick = ref(0); // goes up whenever automatic fields change
  const lastCalc = ref([]); // the automatic fields that changed in the last step
  const status = ref(''); // '' | 'saving' | 'saved' | 'error'
  let timer = 0;

  const current = computed(() => list.value.find(s => s.id === currentId.value) || null);
  const token = () => cloud.getToken();

  async function refresh() {
    try {
      list.value = await api.listSheets(await token());
      error.value = '';
    } catch (e) {
      error.value = e && e.msg ? e.msg : 'Could not load the sheets.';
    }
  }

  async function upload(file) {
    const id = uid();
    const path = `${id}.pdf`;
    const data = new Uint8Array(await file.arrayBuffer());
    const { fields } = await readFields(data); // reject files that are not a fillable sheet
    if (!fields.length) throw new Error('This PDF has no fillable fields.');
    const tok = await token();
    await api.uploadPdf(tok, path, data);
    await api.insertSheet(tok, { id, name: file.name.replace(/\.pdf$/i, ''), storage_path: path, fields: {} });
    await refresh();
    return id;
  }

  async function open(id, mode = 'open') {
    const row = list.value.find(s => s.id === id);
    if (!row) return;
    currentId.value = id;
    localStorage.setItem(OPEN_KEY, id);
    panel.value = mode;
    const data = await api.downloadPdf(await token(), row.storage_path);
    const read = await readFields(data);
    // everything the viewer needs is set before the PDF is handed over, so it is drawn with it
    schema.value = read.fields;
    calcs.value = read.calcs;
    decimals.value = read.decimals;
    bytes.value = data;
    // the PDF's own values < what is saved in the cloud < changes still waiting to be saved on this device
    const base = Object.fromEntries(read.fields.map(f => [f.name, f.value]));
    Object.keys(values).forEach(k => delete values[k]);
    Object.assign(values, base, row.fields || {}, readPending(id));
    applyCalc();
  }

  // Recalculates the automatic fields (totals, modifiers, loads) from the current values. Only shown on the sheet
  // and exported; they are not saved, so they are always worked out from what is entered.
  function applyCalc() {
    if (!Object.keys(calcs.value).length) return;
    // checkboxes are true/false here, but the formulas read them as "1" / "" and write "Yes"
    const kinds = Object.fromEntries(schema.value.map(f => [f.name, f.kind]));
    const yes = v => v === true || v === '1' || v === 'Yes';
    const input = {};
    for (const [k, v] of Object.entries(values)) input[k] = kinds[k] === 'check' ? (yes(v) ? '1' : '') : v;
    const changed = recalc(input, calcs.value);
    const moved = [];
    for (const [name, v] of Object.entries(changed)) {
      const now = kinds[name] === 'check' ? yes(v) : v;
      // only a real change counts: otherwise the page and the store would keep answering each other
      if (values[name] === now) continue;
      values[name] = now;
      moved.push(name);
    }
    lastCalc.value = moved;
    if (moved.length) calcTick.value++;
  }

  function setField(name, value) {
    values[name] = value;
    const pending = readPending(currentId.value);
    pending[name] = value;
    localStorage.setItem(pendingKey(currentId.value), JSON.stringify(pending));
    clearTimeout(timer);
    timer = setTimeout(saveNow, 800);
    applyCalc();
  }

  async function saveNow() {
    const id = currentId.value;
    if (!id) return;
    status.value = 'saving';
    try {
      const row = list.value.find(s => s.id === id);
      const merged = { ...(row?.fields || {}), ...readPending(id) };
      await api.saveFields(await token(), id, merged);
      if (row) row.fields = merged;
      localStorage.removeItem(pendingKey(id));
      status.value = 'saved';
    } catch {
      status.value = 'error'; // the changes stay on this device and are sent next time
    }
  }

  /** The PDF with the current values written into its fields (bytes, for the download link). */
  async function exportPdf() {
    if (!bytes.value) return null;
    return fillPdf(bytes.value, values);
  }

  async function remove(id) {
    const row = list.value.find(s => s.id === id);
    if (!row) return;
    await api.deleteSheet(await token(), id, row.storage_path);
    if (currentId.value === id) close();
    await refresh();
  }

  function minimize() {
    if (currentId.value) panel.value = 'min';
  }
  function restore() {
    if (currentId.value) panel.value = 'open';
  }
  function close() {
    panel.value = 'closed';
  }
  /** Stop showing this sheet in the dock (it stays in the list and in the cloud). */
  function dismiss() {
    panel.value = 'closed';
    currentId.value = '';
    bytes.value = null;
    localStorage.removeItem(OPEN_KEY);
  }

  return {
    list, error, currentId, current, panel, schema, values, bytes, status, calcs, decimals, calcTick, lastCalc,
    refresh, upload, open, setField, saveNow, exportPdf, remove, minimize, restore, close, dismiss,
  };
});
