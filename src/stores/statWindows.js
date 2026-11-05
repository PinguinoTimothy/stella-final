// Stat block windows, like browser windows. A window holds one or more monsters as tabs.
// Tabs can be split off into their own window, and windows can be merged into one another.
// The layout lives in memory for this session. The list order is the stacking order: the last window is on top.
import { defineStore } from 'pinia';
import { ref } from 'vue';

const KEEP = 60; // px of a window that must stay on screen, so it can always be grabbed again
const HEADER = 40; // px of the title bar that must stay on screen
const MIN_W = 280;
const MIN_H = 200;
const GAP = 8;
const MARGIN = 8;
const STEP = 28;

let seq = 0;

export const useStatWindows = defineStore('statWindows', () => {
  // { id, uids: [monster uid, ...], active: uid of the tab shown, opened, x, y, w, h }
  const list = ref([]);

  const byId = id => list.value.find(w => w.id === id) || null;
  const windowOf = uid => list.value.find(w => w.uids.includes(uid)) || null;
  const isOpen = uid => !!windowOf(uid);
  const topWindow = () => list.value.at(-1) || null;

  /** Where a new window goes: a small cascade, so windows opened one after another do not hide each other. */
  function place(n) {
    const off = (n % 8) * STEP;
    const w = Math.max(MIN_W, Math.min(440, window.innerWidth - 40));
    const h = Math.max(MIN_H, Math.min(520, window.innerHeight - 140));
    return {
      x: Math.max(MARGIN, Math.min(24 + off, window.innerWidth - w - MARGIN)),
      y: Math.max(MARGIN, Math.min(72 + off, window.innerHeight - h - MARGIN)),
      w,
      h,
    };
  }

  function newWindow(uids, active, geo) {
    const id = ++seq;
    return { id, uids, active, opened: id, ...geo };
  }

  /** Brings a window to the front. */
  function front(id) {
    const i = list.value.findIndex(w => w.id === id);
    if (i < 0 || i === list.value.length - 1) return;
    const [win] = list.value.splice(i, 1);
    list.value.push(win);
  }

  /** Opens the monster in a new window, or shows it if it is already open somewhere. */
  function open(uid) {
    const w = windowOf(uid);
    if (w) return activate(uid);
    list.value.push(newWindow([uid], uid, place(list.value.length)));
  }

  /** Shows a monster's tab and brings its window to the front. */
  function activate(uid) {
    const w = windowOf(uid);
    if (!w) return;
    w.active = uid;
    front(w.id);
  }

  function setActive(id, uid) {
    const w = byId(id);
    if (!w || !w.uids.includes(uid)) return;
    w.active = uid;
    front(id);
  }

  /** Closes one tab. A window with no tabs left goes too. */
  function closeTab(uid) {
    const w = windowOf(uid);
    if (!w) return;
    w.uids = w.uids.filter(u => u !== uid);
    if (!w.uids.length) list.value = list.value.filter(x => x.id !== w.id);
    else if (w.active === uid) w.active = w.uids.at(-1);
  }

  function closeWindow(id) {
    list.value = list.value.filter(w => w.id !== id);
  }

  function closeAll() {
    list.value = [];
  }

  /** Splits a tab off its window into a new window at (x, y). Returns the new window's id. */
  function detach(uid, x, y) {
    const w = windowOf(uid);
    if (!w || w.uids.length < 2) return null;
    w.uids = w.uids.filter(u => u !== uid);
    if (w.active === uid) w.active = w.uids.at(-1);
    const nw = newWindow([uid], uid, { x: Math.round(x), y: Math.round(y), w: w.w, h: w.h });
    list.value.push(nw);
    return nw.id;
  }

  /** Puts all the tabs of window `fromId` into window `toId`, after its own. */
  function merge(fromId, toId) {
    const from = byId(fromId);
    const to = byId(toId);
    if (!from || !to || from === to) return;
    to.uids = [...to.uids, ...from.uids.filter(u => !to.uids.includes(u))];
    to.active = from.active;
    list.value = list.value.filter(w => w.id !== fromId);
    front(toId);
  }

  /** Drops the monsters that are no longer in combat, and the windows left empty. */
  function prune(uids) {
    list.value = list.value
      .map(w => {
        w.uids = w.uids.filter(u => uids.includes(u));
        if (w.uids.length && !w.uids.includes(w.active)) w.active = w.uids.at(-1);
        return w;
      })
      .filter(w => w.uids.length);
  }

  function move(id, x, y) {
    const win = byId(id);
    if (!win) return;
    win.x = Math.round(Math.min(Math.max(x, KEEP - win.w), window.innerWidth - KEEP));
    win.y = Math.round(Math.min(Math.max(y, 0), window.innerHeight - HEADER));
  }

  function resize(id, w, h) {
    const win = byId(id);
    if (!win) return;
    win.w = Math.round(Math.max(MIN_W, Math.min(w, window.innerWidth - win.x)));
    win.h = Math.round(Math.max(MIN_H, Math.min(h, window.innerHeight - win.y)));
  }

  /** Windows in the opening order, in a grid that fills the area `b` (left, top, right, bottom). */
  function tile(b) {
    const items = [...list.value].sort((a, c) => a.opened - c.opened);
    const n = items.length;
    if (!n) return;
    const W = b.right - b.left;
    const H = b.bottom - b.top;
    const cols = Math.min(n, Math.max(1, Math.round(Math.sqrt((n * W) / H))));
    const rows = Math.ceil(n / cols);
    const w = (W - GAP * (cols - 1)) / cols;
    const h = (H - GAP * (rows - 1)) / rows;
    items.forEach((win, i) => {
      Object.assign(win, {
        x: Math.round(b.left + (i % cols) * (w + GAP)),
        y: Math.round(b.top + Math.floor(i / cols) * (h + GAP)),
        w: Math.round(w),
        h: Math.round(h),
      });
    });
    list.value = items;
  }

  /** Windows stacked from the top-left corner of the area `b`, each one a step lower and to the right. */
  function cascade(b) {
    const items = [...list.value].sort((a, c) => a.opened - c.opened);
    const W = b.right - b.left;
    const H = b.bottom - b.top;
    const w = Math.max(MIN_W, Math.min(520, W * 0.7));
    const h = Math.max(MIN_H, Math.min(640, H * 0.85));
    items.forEach((win, i) => {
      const off = (i % 8) * STEP;
      Object.assign(win, {
        x: Math.round(b.left + off),
        y: Math.round(Math.min(b.top + off, b.bottom - h)),
        w: Math.round(w),
        h: Math.round(h),
      });
    });
    list.value = items;
  }

  return {
    list,
    isOpen,
    windowOf,
    topWindow,
    open,
    activate,
    setActive,
    front,
    closeTab,
    closeWindow,
    closeAll,
    detach,
    merge,
    prune,
    move,
    resize,
    tile,
    cascade,
  };
});
