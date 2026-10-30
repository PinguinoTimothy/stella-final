// Global state: the character data (same shape and localStorage keys as the single-file version),
// UI state, undo snapshots, the toast and the confirm dialog.
import { defineStore } from 'pinia'
import { reactive, ref, watch } from 'vue'
import { fetchLiveView } from '../lib/viewer'

export const KEY = 'pf1e-spells-v2'
export const PARTY_KEY = 'pf1e-party-v1'
const blank = () => ({ name: '', cl: [], items: [], db: [], rate: {}, fx: [], money: {}, log: [], cond: [] })

export const useAppStore = defineStore('app', () => {
  const S = reactive(blank())
  const party = ref([])
  
  const ui = reactive({ tab: 'items', itemView: 'inventory', owner: '', search: '' })
  const toast = ref(null)
  const dialog = ref(null)
  let undoSnap = null, toastTimer = 0, saveTimer = 0
const viewer = ref(
  new URLSearchParams(window.location.search).has('view') ||
  new URLSearchParams(window.location.search).has('src')
)
const viewerStatus = ref('idle')
const viewerUpdatedAt = ref('')
const viewerError = ref('')
const viewerRevision = ref(null)

  /** Replaces the whole state (used by undo and by the cloud). */
  function replace(state, partyList) {
    Object.keys(S).forEach((k) => delete S[k])
    Object.assign(S, blank(), state)
    if (partyList) party.value = partyList
  }

  function load() {
    try {
      if (viewer.value) {
  replace(blank(), [])
  return
}
      const raw = localStorage.getItem(KEY)
      if (raw) replace(JSON.parse(raw))
      const p = JSON.parse(localStorage.getItem(PARTY_KEY) || '[]')
      if (Array.isArray(p)) party.value = p.filter((n) => typeof n === 'string' && n.trim())
    } catch { /* corrupt local data: start empty, the cloud copy can restore it */ }
  }

  function writeLocal() {
    try {
      if (viewer.value) return
      localStorage.setItem(KEY, JSON.stringify(S))
      localStorage.setItem(PARTY_KEY, JSON.stringify(party.value))
    } catch { /* storage full or blocked */ }
  }

  function startPersisting() {
    if (viewer.value) return
    watch([S, party], () => { clearTimeout(saveTimer); saveTimer = setTimeout(writeLocal, 250) }, { deep: true })
    addEventListener('pagehide', writeLocal)
  }

  /* ----- undo ----- */
  const snapshot = () => { undoSnap = JSON.stringify({ S, party: party.value }) }
  function undo() {
    if (!undoSnap) return
    const o = JSON.parse(undoSnap); undoSnap = null
    replace(o.S, o.party); closeToast()
  }

  /* ----- toast ----- */
  function notify(msg, opts = {}) {
    toast.value = { msg, ...opts }
    clearTimeout(toastTimer); toastTimer = setTimeout(closeToast, 9000)
  }
  const notifyUndo = (msg) => notify(msg, { label: 'Undo', run: undo })
  const closeToast = () => { toast.value = null }

  /* ----- confirm dialog: `if (await app.ask({...}))` ----- */
  const ask = (spec) => new Promise((res) => { dialog.value = { ...spec, done: (ans) => { dialog.value = null; res(ans) } } })

  /* ----- history log (kept in the cloud as the "history" setting) ----- */
  function log(k, m, d = '') {
    S.log.push({ t: Date.now(), k, m, d })
    if (S.log.length > 300) S.log.splice(0, S.log.length - 300)
  }

async function loadViewer() {
  if (!viewer.value) return

  try {
    const result = await fetchLiveView()

    if (!result) {
      viewerStatus.value = 'error'
      viewerError.value = 'Todavía no se ha publicado la partida.'
      return
    }

    if (viewerRevision.value === result.revision) return

    replace(result.data, result.data.party)

    viewerRevision.value = result.revision
    viewerUpdatedAt.value = result.updatedAt || ''
    viewerStatus.value = 'ok'
    viewerError.value = ''
  } catch (error) {
    console.error('Error loading player view:', error)

    viewerStatus.value = 'error'
    viewerError.value = 'No se pudo cargar la partida. Comprueba la conexión.'
  }
}
  return {
  S, party, ui, toast, dialog, viewer,
  replace, load, startPersisting, snapshot, undo,
  notify, notifyUndo, closeToast, ask, log, viewer,
viewerStatus,
viewerUpdatedAt,
viewerError,
viewerRevision,
loadViewer,
}})
