<script setup>
// Stat block windows, like browser windows. A window holds monsters as tabs.
// - Click a tab to show it. Its × closes the tab; the window's × closes the whole window.
// - Drag a tab out of a window to split it off into its own window.
// - Drag a window by its title bar and drop it on another window to merge them into one.
// - Drag the bottom-right corner to resize.
import { computed, onUnmounted, ref } from 'vue';
import { useMonsterFights } from '../../stores/monsterFights';
import { useStatWindows } from '../../stores/statWindows';
import CombatCard from '../Monsters/CombatCard.vue';

const DRAG_AT = 6; // px the pointer must travel before a tab turns into a window

const fights = useMonsterFights();
const wins = useStatWindows();

const fightOf = uid => fights.fights.find(f => f.uid === uid) || null;
const isDown = f => !f.loading && f.maxHp > 0 && f.hp <= 0;

// The windows with their monsters, in tab order. A window with no monster left is not drawn.
const view = computed(() =>
  wins.list
    .map(w => {
      const tabs = w.uids.map(fightOf).filter(Boolean);
      return { ...w, tabs, shown: tabs.find(f => f.uid === w.active) || tabs[0] || null };
    })
    .filter(w => w.tabs.length),
);

/* ----- pointer work: moving, splitting, merging and resizing. Listeners live on the window, so the
   pointer keeps working even when the element it started on is removed (a tab that is split off). ----- */
const drag = ref(null); // { mode: 'move' | 'tab' | 'resize', pid, winId, uid, sx, sy, x, y, w, h, moved }
const dropId = ref(null); // the window a dragged window would merge into

function begin(e, w, mode, uid = null) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  wins.front(w.id);
  drag.value = { mode, pid: e.pointerId, winId: w.id, uid, sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, w: w.w, h: w.h, moved: mode !== 'tab' };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onEnd);
  window.addEventListener('pointercancel', onEnd);
  e.preventDefault();
}

/** The window under the pointer, other than the one being dragged. */
function windowUnder(e, selfId) {
  const el = document
    .elementsFromPoint(e.clientX, e.clientY)
    .find(n => n.classList?.contains('sw') && Number(n.dataset.winId) !== selfId);
  return el ? Number(el.dataset.winId) : null;
}

function onMove(e) {
  const d = drag.value;
  if (!d || e.pointerId !== d.pid) return;
  const dx = e.clientX - d.sx;
  const dy = e.clientY - d.sy;

  if (d.mode === 'resize') {
    wins.resize(d.winId, d.w + dx, d.h + dy);
    return;
  }

  if (d.mode === 'tab' && !d.moved) {
    if (Math.hypot(dx, dy) < DRAG_AT) return;
    d.moved = true;
    const source = wins.windowOf(d.uid);
    if (source && source.uids.length > 1) {
      // A tab from a window with others splits off and follows the pointer, like a browser tab.
      const id = wins.detach(d.uid, e.clientX - 80, e.clientY - 16);
      const nw = wins.list.find(w => w.id === id);
      if (nw) Object.assign(d, { winId: id, sx: e.clientX, sy: e.clientY, x: nw.x, y: nw.y, w: nw.w, h: nw.h, mode: 'move' });
      return;
    }
    // The only tab in its window: the window moves.
    d.mode = 'move';
  }

  if (d.mode === 'move') {
    wins.move(d.winId, d.x + dx, d.y + dy);
    dropId.value = windowUnder(e, d.winId);
  }
}

function onEnd(e) {
  const d = drag.value;
  if (!d || e.pointerId !== d.pid) return;
  if (d.mode === 'move' && dropId.value != null) wins.merge(d.winId, dropId.value);
  drag.value = null;
  dropId.value = null;
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerup', onEnd);
  window.removeEventListener('pointercancel', onEnd);
}

onUnmounted(() => {
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerup', onEnd);
  window.removeEventListener('pointercancel', onEnd);
});
</script>

<template>
  <section
    v-for="(w, i) in view"
    :key="w.id"
    class="sw"
    :class="{ top: i === view.length - 1, drop: dropId === w.id }"
    :data-win-id="w.id"
    :style="{ left: w.x + 'px', top: w.y + 'px', width: w.w + 'px', height: w.h + 'px', zIndex: 70 + i }"
    role="dialog"
    :aria-label="`Stat blocks, ${w.tabs.length} open`"
    @pointerdown="wins.front(w.id)"
  >
    <header class="sw-head" title="Drag to move" @pointerdown="begin($event, w, 'move')">
      <div class="sw-tabs" role="tablist">
        <div
          v-for="f in w.tabs"
          :key="f.uid"
          class="sw-tab"
          :class="{ active: f.uid === w.shown.uid, down: isDown(f) }"
        >
          <button
            type="button"
            role="tab"
            class="sw-tab-btn"
            :aria-selected="f.uid === w.shown.uid"
            :title="`${f.name}. Drag out to split off.`"
            @pointerdown.stop="begin($event, w, 'tab', f.uid)"
            @click="wins.setActive(w.id, f.uid)"
          >
            <span class="sw-tab-name">{{ f.name }}</span>
            <small>{{ f.hp }}/{{ f.maxHp }}</small>
          </button>
          <button
            type="button"
            class="sw-tab-x"
            :aria-label="`Close ${f.name}`"
            @pointerdown.stop
            @click="wins.closeTab(f.uid)"
          >
            ×
          </button>
        </div>
      </div>
      <button type="button" class="sw-close" aria-label="Close window" @pointerdown.stop @click="wins.closeWindow(w.id)">
        ×
      </button>
    </header>

    <div class="sw-body">
      <p v-if="w.shown.loading" class="mute">Loading…</p>
      <p v-else-if="w.shown.error" class="mute" role="alert">{{ w.shown.error }}</p>
      <CombatCard v-else-if="w.shown.card" :card="w.shown.card" />
      <p v-else class="mute">This creature is not from the bestiary, so it has no stat block.</p>
    </div>

    <div class="sw-resize" aria-hidden="true" @pointerdown="begin($event, w, 'resize')"></div>
  </section>
</template>

<style scoped>
.sw {
  position: fixed;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-width: 0;
  background: var(--surface, #11222d);
  border: 1px solid var(--line, #264452);
  border-radius: 14px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}
.sw.top {
  border-color: var(--acc, #a99bff);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
}
/* A window dragged over this one will merge into it. */
.sw.drop {
  outline: 2px dashed var(--acc, #a99bff);
  outline-offset: -6px;
}

/* The title bar holds the tabs and is the handle for moving the window. */
.sw-head {
  flex: none;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 6px 6px 6px 6px;
  background: var(--raise, #172e3b);
  border-bottom: 1px solid var(--line, #264452);
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.sw-head:active {
  cursor: grabbing;
}
.sw.top .sw-head {
  border-bottom-color: var(--acc, #a99bff);
}

.sw-tabs {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.sw-tab {
  flex: none;
  max-width: 100%;
  display: flex;
  align-items: center;
  border: 1px solid var(--line, #264452);
  border-radius: 10px;
  background: var(--surface, #11222d);
}
.sw-tab.active {
  border-color: var(--acc, #a99bff);
  background: color-mix(in srgb, var(--acc, #a99bff) 14%, var(--surface, #11222d));
}
.sw-tab-btn {
  min-width: 0;
  min-height: 34px;
  padding: 2px 6px 2px 10px;
  display: flex;
  align-items: baseline;
  gap: 6px;
  border: 0;
  border-radius: 0;
  background: none;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}
.sw-tab.active .sw-tab-btn {
  color: var(--acc, #a99bff);
}
.sw-tab.down .sw-tab-name {
  text-decoration: line-through;
  opacity: 0.6;
}
/* Names wrap onto more lines instead of being cut off. */
.sw-tab-name {
  min-width: 0;
  overflow-wrap: anywhere;
}
.sw-tab-btn small {
  color: var(--mute, #93b6ba);
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.sw-tab-x,
.sw-close {
  flex: none;
  min-width: 28px;
  min-height: 28px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  font-size: 18px;
  line-height: 1;
}
.sw-tab-x {
  margin-right: 2px;
}
.sw-close {
  min-width: 32px;
  min-height: 32px;
  margin-top: 2px;
}

.sw-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 12px 14px 22px;
}

/* Bottom-right corner: drag to resize. */
.sw-resize {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 20px;
  height: 20px;
  cursor: nwse-resize;
  touch-action: none;
  background: linear-gradient(
    135deg,
    transparent 0 55%,
    var(--mute, #93b6ba) 55% 60%,
    transparent 60% 72%,
    var(--mute, #93b6ba) 72% 77%,
    transparent 77%
  );
  opacity: 0.6;
}
</style>
