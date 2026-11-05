<script setup>
// Stat block windows: one floating window per open monster, drawn over the page.
// Drag the title bar to move a window, its corner to resize it, and click anywhere in it to bring it to the front.
import { computed, ref } from 'vue';
import { useMonsterFights } from '../../stores/monsterFights';
import { useStatWindows } from '../../stores/statWindows';
import CombatCard from '../Monsters/CombatCard.vue';

const fights = useMonsterFights();
const wins = useStatWindows();

const fightOf = uid => fights.fights.find(f => f.uid === uid) || null;
// Only windows whose monster still exists are drawn (the panel removes the others on the next tick).
const shown = computed(() => wins.list.filter(w => fightOf(w.uid)));
const isDown = f => !f.loading && f.maxHp > 0 && f.hp <= 0;

// What the pointer is doing: moving or resizing one window. Captured by the window, so it keeps working off the edge.
const drag = ref(null);
function start(e, win, mode) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (mode === 'move' && e.target.closest('button, input, select, textarea, a')) return;
  wins.focus(win.uid);
  drag.value = { uid: win.uid, id: e.pointerId, mode, sx: e.clientX, sy: e.clientY, x: win.x, y: win.y, w: win.w, h: win.h };
  e.currentTarget.setPointerCapture?.(e.pointerId);
  e.preventDefault();
}
function onMove(e) {
  const d = drag.value;
  if (!d || e.pointerId !== d.id) return;
  const dx = e.clientX - d.sx;
  const dy = e.clientY - d.sy;
  if (d.mode === 'move') wins.move(d.uid, d.x + dx, d.y + dy);
  else wins.resize(d.uid, d.w + dx, d.h + dy);
}
function onEnd(e) {
  if (drag.value && e.pointerId === drag.value.id) drag.value = null;
}
</script>

<template>
  <section
    v-for="(win, i) in shown"
    :key="win.uid"
    class="sw"
    :class="{ top: win.uid === wins.topUid(), down: isDown(fightOf(win.uid)) }"
    :style="{ left: win.x + 'px', top: win.y + 'px', width: win.w + 'px', height: win.h + 'px', zIndex: 70 + i }"
    role="dialog"
    :aria-label="`Stat block of ${fightOf(win.uid).name}`"
    @pointerdown="wins.focus(win.uid)"
    @pointermove="onMove"
    @pointerup="onEnd"
    @pointercancel="onEnd"
  >
    <header class="sw-head" title="Drag to move" @pointerdown="start($event, win, 'move')">
      <span class="sw-title">
        <b class="sw-name">{{ fightOf(win.uid).name }}</b>
        <small class="sw-hp">{{ fightOf(win.uid).hp }}/{{ fightOf(win.uid).maxHp }}</small>
      </span>
      <button type="button" class="sw-close" :aria-label="`Close ${fightOf(win.uid).name}`" @click="wins.close(win.uid)">
        ×
      </button>
    </header>

    <div class="sw-body">
      <p v-if="fightOf(win.uid).loading" class="mute">Loading…</p>
      <p v-else-if="fightOf(win.uid).error" class="mute" role="alert">{{ fightOf(win.uid).error }}</p>
      <CombatCard v-else-if="fightOf(win.uid).card" :card="fightOf(win.uid).card" />
      <p v-else class="mute">This creature is not from the bestiary, so it has no stat block.</p>
    </div>

    <div class="sw-resize" aria-hidden="true" @pointerdown="start($event, win, 'resize')"></div>
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

/* The title bar is the handle for moving the window. */
.sw-head {
  flex: none;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 8px 8px 12px;
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

.sw-title {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
}
.sw-name {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 16px;
  line-height: 1.25;
}
.sw.top .sw-name {
  color: var(--acc, #a99bff);
}
.sw.down .sw-name {
  text-decoration: line-through;
  opacity: 0.6;
}
.sw-hp {
  color: var(--mute, #93b6ba);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.sw-close {
  flex: none;
  min-width: 32px;
  min-height: 32px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  font-size: 20px;
  line-height: 1;
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
