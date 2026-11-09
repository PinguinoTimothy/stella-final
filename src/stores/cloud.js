// Cloud save: the whole state lives in Supabase tables (see schema.sql); the device keeps a copy as cache.
// Flow: local change -> diff against the last synced snapshot -> one atomic RPC. A revision number detects
// two devices saving over each other; the user then chooses which copy to keep.
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useAppStore } from './app';
import * as sb from '../lib/supabase';
import { buildRows, buildState, diff, fullChanges, snapOf } from '../lib/mapping';

// Same keys as the single-file version, so both share the session and sync bookkeeping on one origin.
const DM_PIN_KEY = 'stella-dm-pin-v1';
const SESS = 'pf1e-sb-session',
  META = 'pf1e-cloud-meta2',
  SNAP = 'pf1e-cloud-snap2',
  BACKUPS = 'pf1e-local-backups'; // this device's unsynced edits, replaced by the server copy (newest first, max 3)
const read = k => {
  try {
    return JSON.parse(localStorage.getItem(k) || 'null');
  } catch {
    return null;
  }
};
const write = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* quota */
  }
};
// The DM code lives only as long as the tab: sessionStorage, not localStorage (which survives restarts).
const pinGet = () => {
  try {
    return sessionStorage.getItem(DM_PIN_KEY) || '';
  } catch {
    return '';
  }
};
const pinSet = v => {
  try {
    sessionStorage.setItem(DM_PIN_KEY, v);
  } catch {
    /* storage off */
  }
};
const pinClear = () => {
  try {
    sessionStorage.removeItem(DM_PIN_KEY);
  } catch {
    /* ignore */
  }
};
// Older builds kept the code in localStorage; remove that copy.
try {
  localStorage.removeItem(DM_PIN_KEY);
} catch {
  /* ignore */
}

const hasData = T => ['characters', 'items', 'caster_classes', 'effects', 'spells'].some(t => (T[t] || []).length > 0);

export const useCloudStore = defineStore('cloud', () => {
  const app = useAppStore();
  const meta0 = read(META) || {};
  const session = ref(read(SESS));
  const dmPin = ref(pinGet());
  const state = ref(''); // '' | sync | ok | err
  const code = ref('');
  const at = ref('');
  const dirty = ref(!!meta0.dirty);
  let rev = meta0.rev ?? null,
    snap = read(SNAP),
    busy = false,
    timer = 0;

  const rows = () => buildRows(app.S, app.party);
  const saveMeta = () => write(META, { rev, dirty: dirty.value });
  const saveSnap = () => write(SNAP, snap);

  const status = computed(() => {
    if (!session.value) return 'Saved on this device only. Sign in to save to the cloud.';
    if (state.value === 'sync') return 'Saving to the cloud…';
    if (state.value === 'err')
      return (
        'Couldn’t reach the cloud' +
        (code.value ? ` (${code.value})` : '') +
        '. Your data is safe on this device and will retry.'
      );
    if (dirty.value) return 'Changes waiting to sync…';
    return at.value ? 'Saved to the cloud · ' + new Date(at.value).toLocaleTimeString() : 'Cloud save is on';
  });

  async function token() {
    const s = session.value;
    if (!s) throw { code: 401 };
    if (s.exp - Date.now() > 60000) return s.at;
    const n = await sb.refresh(s);
    session.value = n;
    write(SESS, n);
    return n.at;
  }

  function fail(e) {
    const cd = e && e.code !== undefined ? e.code : e;
    if (cd === 401) {
      signOut();
      app.notify('Session expired. Sign in again in More › Cloud save.');
      return;
    }
    const first = state.value !== 'err';
    state.value = 'err';
    code.value = typeof cd === 'number' ? cd + (e && e.msg ? ': ' + e.msg : '') : '';
    if (first) app.notify('Couldn’t save to the cloud. It will be retried.');
  }

  // Unsynced edits on this device are never sent over the server copy. They are kept here, newest first.
  function keepBackup() {
    const list = read(BACKUPS) || [];
    list.unshift({ at: new Date().toISOString(), S: JSON.parse(JSON.stringify(app.S)), party: [...app.party] });
    write(BACKUPS, list.slice(0, 3));
  }

  function adopt(newRev, T) {
    const b = buildState(T);
    const hadEdits = dirty.value;
    if (hadEdits) keepBackup(); // the server copy replaces this device's copy; the edits stay in the backup
    app.replace(b.s, b.party);
    rev = newRev;
    state.value = 'ok';
    code.value = '';
    at.value = new Date().toISOString();
    snap = b.mig ? null : snapOf(rows());
    dirty.value = !!b.mig;
    saveSnap();
    saveMeta();
    if (b.mig) push(false);
    if (hadEdits) app.notify('The server copy was loaded. Your unsaved changes are in the backup on this device.');
  }

  let diffTimer = 0;
  function checkNow() {
    clearTimeout(diffTimer);
    diffTimer = 0;
    if (!diff(rows(), snap).n) return;
    dirty.value = true;
    saveMeta();
    if (!session.value) return;
    clearTimeout(timer);
    timer = setTimeout(() => push(false), 1500);
  }
  function schedule() {
    clearTimeout(diffTimer);
    diffTimer = setTimeout(checkNow, 120);
  }
  const flushDiff = () => {
    if (diffTimer) checkNow();
  };

  async function push(full = false) {
    if (busy || !session.value) return;
    const R = rows(),
      D = full ? null : diff(R, snap);
    if (!full && !D.n) {
      dirty.value = false;
      state.value = 'ok';
      saveMeta();
      return;
    }
    const changes = full ? fullChanges(R) : D.changes,
      snapNow = snapOf(R);
    busy = true;
    state.value = 'sync';
    try {
      rev = await sb.applyChanges(await token(), rev, changes, full);
      snap = snapNow;
      saveSnap();
      state.value = 'ok';
      code.value = '';
      at.value = new Date().toISOString();
      dirty.value = diff(rows(), snap).n > 0;
      saveMeta();
      if (dirty.value) timer = setTimeout(() => push(false), 800); // edited while saving
    } catch (e) {
      if (e && e.conflict) {
        // another device saved first: take the server copy
        await syncFromServer().catch(fail);
      } else {
        fail(e);
      }
    } finally {
      busy = false;
    }
  }

  async function sync() {
    if (app.mode === 'dm') return dmPull();
    flushDiff(); // a change made in the last moment must count before deciding what to do
    if (!session.value || busy) return;
    state.value = 'sync';
    try {
      const tok = await token(),
        row = await sb.fetchRev(tok);
      if (!row) {
        // No campaign row yet. Upload this device's copy only if the cloud tables are really empty.
        const T = await sb.fetchState(tok);
        if (!hasData(T)) {
          rev = null;
          return await push(true);
        }
        return adopt(0, T);
      }
      if (rev === +row.rev) {
        // the server has not changed since our last save: only send our own edits
        if (dirty.value) return await push(false);
        state.value = 'ok';
        if (!snap) {
          snap = snapOf(rows());
          saveSnap();
        }
        return;
      }
      // the server changed (another device or the DM tool): its copy wins
      await syncFromServer();
    } catch (e) {
      fail(e);
    }
  }

  // Loads the server copy, keeping unsynced edits in the backup.
  async function syncFromServer() {
    const tok = await token(),
      row = await sb.fetchRev(tok);
    if (!row) return;
    adopt(+row.rev, await sb.fetchState(tok));
  }

  // DM: the database checks the code and returns the campaign. The device keeps the code to read again.
  async function dmPull() {
    if (!dmPin.value) return false;
    try {
      const r = await sb.dmRead(dmPin.value);
      if (r.error) {
        state.value = 'err';
        code.value = r.error;
        if (r.error === 'wrong') {
          dmPin.value = '';
          pinClear();
        }
        return false;
      }
      if (+r.rev !== rev) adopt(+r.rev, r.tables);
      state.value = 'ok';
      return true;
    } catch (e) {
      fail(e);
      return false;
    }
  }

  async function dmUnlock(pin) {
    dmPin.value = pin;
    const ok = await dmPull();
    if (ok) pinSet(pin);
    return ok;
  }

  async function signIn(email, password) {
    const s = await sb.passwordLogin(email, password); // throws on wrong credentials: the caller shows it
    session.value = s;
    write(SESS, s);
    await sync();
  }

  function signOut() {
    clearTimeout(timer);
    session.value = null;
    state.value = '';
    try {
      localStorage.removeItem(SESS);
    } catch {
      /* ignore */
    }
  }

  function init() {
    if (app.mode === 'dm') {
      // the DM reads the campaign and never writes it
      if (dmPin.value) dmPull();
      setInterval(() => {
        if (!document.hidden && dmPin.value) dmPull();
      }, 10000);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && dmPin.value) dmPull();
      });
      return;
    }
    if (app.viewer) return;
    if (!snap && !dirty.value) {
      snap = snapOf(rows());
      saveSnap();
    }
    watch(() => [app.S, app.party], schedule, { deep: true });
    addEventListener('pagehide', flushDiff);
    addEventListener('online', sync);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !dirty.value) sync();
    });
    if (session.value) sync();
  }

  return {
    session,
    state,
    status,
    dirty,
    signIn,
    signOut,
    sync,
    init,
    dmPin,
    dmUnlock,
    dmPull,
    syncFromServer,
    push,
    code,
  };
});
