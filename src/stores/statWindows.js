// Stat block windows: each open monster has its own floating window, which can be moved, resized and arranged.
// The layout lives in memory for this session. The list order is the stacking order: the last window is on top.
import { defineStore } from 'pinia';
import { ref } from 'vue';

const KEEP = 60; // px of a window that must stay on screen, so it can always be grabbed again
const HEADER = 40; // px of the title bar that must stay on screen
const MIN_W = 280;
const MIN_H = 200;
const GAP = 8;
const MARGIN = 8;
const CASCADE_STEP = 28;

let seq = 0;

export const useStatWindows = defineStore('statWindows', () => {
  const list = ref([]); // { uid, opened, x, y, w, h }

  const isOpen = uid => list.value.some(w => w.uid === uid);
  const topUid = () => list.value.at(-1)?.uid ?? null;

  /** Where a new window goes: a small cascade so that windows opened one after another do not hide each other. */
  function place(n) {
    const off = (n % 8) * CASCADE_STEP;
    const w = Math.max(MIN_W, Math.min(440, window.innerWidth - 40));
    const h = Math.max(MIN_H, Math.min(520, window.innerHeight - 140));
    return {
      x: Math.max(MARGIN, Math.min(24 + off, window.innerWidth - w - MARGIN)),
      y: Math.max(MARGIN, Math.min(72 + off, window.innerHeight - h - MARGIN)),
      w,
      h,
    };
  }

  function open(uid) {
    if (isOpen(uid)) return focus(uid);
    list.value.push({ uid, opened: ++seq, ...place(list.value.length) });
  }

  /** Brings a window to the front. */
  function focus(uid) {
    const i = list.value.findIndex(w => w.uid === uid);
    if (i < 0 || i === list.value.length - 1) return;
    const [win] = list.value.splice(i, 1);
    list.value.push(win);
  }

  function close(uid) {
    list.value = list.value.filter(w => w.uid !== uid);
  }

  function closeAll() {
    list.value = [];
  }

  /** Drops the windows of monsters that were removed from combat. */
  function prune(uids) {
    if (list.value.some(w => !uids.includes(w.uid))) list.value = list.value.filter(w => uids.includes(w.uid));
  }

  function move(uid, x, y) {
    const win = list.value.find(w => w.uid === uid);
    if (!win) return;
    win.x = Math.round(Math.min(Math.max(x, KEEP - win.w), window.innerWidth - KEEP));
    win.y = Math.round(Math.min(Math.max(y, 0), window.innerHeight - HEADER));
  }

  function resize(uid, w, h) {
    const win = list.value.find(x => x.uid === uid);
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
      const off = (i % 8) * CASCADE_STEP;
      Object.assign(win, {
        x: Math.round(b.left + off),
        y: Math.round(Math.min(b.top + off, b.bottom - h)),
        w: Math.round(w),
        h: Math.round(h),
      });
    });
    list.value = items;
  }

  return { list, isOpen, topUid, open, focus, close, closeAll, prune, move, resize, tile, cascade };
});
