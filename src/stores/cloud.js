// Cloud save: the whole state lives in Supabase tables (see schema.sql); the device keeps a copy as cache.
// Flow: local change -> diff against the last synced snapshot -> one atomic RPC. A revision number detects
// two devices saving over each other; the user then chooses which copy to keep.
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { KEY, useAppStore } from './app'
import * as sb from '../lib/supabase'
import { buildRows, buildState, diff, fullChanges, snapOf } from '../lib/mapping'

// Same keys as the single-file version, so both share the session and sync bookkeeping on one origin.
const SESS = 'pf1e-sb-session', META = 'pf1e-cloud-meta2', SNAP = 'pf1e-cloud-snap2'
const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null') } catch { return null } }
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* quota */ } }

export const useCloudStore = defineStore('cloud', () => {
  const app = useAppStore()
  const meta0 = read(META) || {}
  const session = ref(read(SESS))
  const state = ref('')            // '' | sync | ok | err | conflict
  const code = ref('')
  const at = ref('')
  const dirty = ref(!!meta0.dirty)
  let rev = meta0.rev ?? null, snap = read(SNAP), busy = false, timer = 0

  const rows = () => buildRows(app.S, app.party)
  const saveMeta = () => write(META, { rev, dirty: dirty.value })
  const saveSnap = () => write(SNAP, snap)

  const status = computed(() => {
    if (!session.value) return 'Saved on this device only. Sign in to save to the cloud.'
    if (state.value === 'sync') return 'Saving to the cloud…'
    if (state.value === 'conflict') return 'The cloud and this device both changed. Choose which one to keep.'
    if (state.value === 'err') return 'Couldn’t reach the cloud' + (code.value ? ` (${code.value})` : '') + '. Your data is safe on this device and will retry.'
    if (dirty.value) return 'Changes waiting to sync…'
    return at.value ? 'Saved to the cloud · ' + new Date(at.value).toLocaleTimeString() : 'Cloud save is on'
  })

  async function token() {
    const s = session.value
    if (!s) throw { code: 401 }
    if (s.exp - Date.now() > 60000) return s.at
    const n = await sb.refresh(s); session.value = n; write(SESS, n)
    return n.at
  }

  function fail(e) {
    const cd = e && e.code !== undefined ? e.code : e
    if (cd === 401) { signOut(); app.notify('Session expired. Sign in again in More › Cloud save.'); return }
    const first = state.value !== 'err'
    state.value = 'err'
    code.value = typeof cd === 'number' ? cd + (e && e.msg ? ': ' + e.msg : '') : ''
    if (first) app.notify('Couldn’t save to the cloud. It will be retried.')
  }

  function conflict() {
    state.value = 'conflict'
    app.notify('The cloud and this device both changed.', { label: 'Use cloud', run: pull, label2: 'Keep mine', run2: force })
  }

  function adopt(newRev, T) {
    const b = buildState(T)
    try { const old = localStorage.getItem(KEY); if (old) localStorage.setItem(KEY + '-backup', old) } catch { /* ignore */ }
    app.replace(b.s, b.party)
    rev = newRev; state.value = 'ok'; code.value = ''; at.value = new Date().toISOString()
    snap = b.mig ? null : snapOf(rows()); dirty.value = !!b.mig
    saveSnap(); saveMeta()
    if (b.mig) push(false)
  }

  function schedule() {
    if (!diff(rows(), snap).n) return
    dirty.value = true; saveMeta()
    if (!session.value || state.value === 'conflict') return
    clearTimeout(timer); timer = setTimeout(() => push(false), 1500)
  }

  async function push(full = false) {
    if (busy || !session.value) return
    const R = rows(), D = full ? null : diff(R, snap)
    if (!full && !D.n) { dirty.value = false; state.value = 'ok'; saveMeta(); return }
    const changes = full ? fullChanges(R) : D.changes, snapNow = snapOf(R)
    busy = true; state.value = 'sync'
    try {
      rev = await sb.applyChanges(await token(), rev, changes, full)
      snap = snapNow; saveSnap(); state.value = 'ok'; code.value = ''; at.value = new Date().toISOString()
      dirty.value = diff(rows(), snap).n > 0; saveMeta()
      if (dirty.value) timer = setTimeout(() => push(false), 800)   // edited while saving
    } catch (e) { e && e.conflict ? conflict() : fail(e) } finally { busy = false }
  }

  async function sync() {
    if (!session.value || busy) return
    state.value = 'sync'
    try {
      const tok = await token(), row = await sb.fetchRev(tok)
      if (!row) { rev = null; return await push(true) }              // empty cloud: upload everything
      if (rev === +row.rev) {
        if (dirty.value) return await push(false)
        state.value = 'ok'
        if (!snap) { snap = snapOf(rows()); saveSnap() }
        return
      }
      if (dirty.value) return conflict()                              // both sides changed
      adopt(+row.rev, await sb.fetchState(tok))                       // only the cloud changed
    } catch (e) { fail(e) }
  }

  async function pull() {
    try {
      const tok = await token(), row = await sb.fetchRev(tok)
      if (!row) throw { code: 'the cloud is empty' }
      adopt(+row.rev, await sb.fetchState(tok))
    } catch (e) { fail(e) }
  }

  async function force() {
    try { const row = await sb.fetchRev(await token()); rev = row ? +row.rev : null; state.value = ''; await push(true) } catch (e) { fail(e) }
  }

  async function signIn(email, password) {
    const s = await sb.passwordLogin(email, password)   // throws on wrong credentials: the caller shows it
    session.value = s; write(SESS, s)
    await sync()
  }

  function signOut() {
    clearTimeout(timer); session.value = null; state.value = ''
    try { localStorage.removeItem(SESS) } catch { /* ignore */ }
  }

  function init() {
    if (app.viewer) return
    if (!snap && !dirty.value) { snap = snapOf(rows()); saveSnap() }
    watch(() => [app.S, app.party], schedule, { deep: true })
    addEventListener('online', sync)
    document.addEventListener('visibilitychange', () => { if (!document.hidden && !dirty.value) sync() })
    if (session.value) sync()
  }

  return { session, state, status, dirty, signIn, signOut, sync, pull, force, init }
})
