<script setup>
// Shows the open sheet above the bottom bar when it is minimized (or closed but still selected): one tap opens it.
import { computed, onBeforeUnmount, watch } from 'vue';
import { useSheetsStore } from '../../stores/sheets';

const sheets = useSheetsStore();
const show = computed(() => !!sheets.current && sheets.panel !== 'open');
// the screens leave room for the bar, so nothing at the end of a screen is hidden behind it
watch(show, v => document.body.classList.toggle('has-sheet-dock', v), { immediate: true });
onBeforeUnmount(() => document.body.classList.remove('has-sheet-dock'));
</script>

<template>
  <div v-if="show" class="sd" role="region" aria-label="Character sheet">
    <button class="sd-open" @click="sheets.restore()">
      <span class="sd-ic" aria-hidden="true">📜</span>
      <span class="sd-name">{{ sheets.current.name }}</span>
      <span class="sd-hint">Open</span>
    </button>
    <button class="sd-x" aria-label="Close sheet" @click="sheets.dismiss()">×</button>
  </div>
</template>

<style>
/* Sits just above the bottom bar, to the left of the combat button, which keeps the right-hand corner. */
.sd {
  position: fixed;
  left: 10px;
  right: 128px;
  bottom: calc(76px + env(safe-area-inset-bottom, 0px));
  z-index: 45;
  display: flex;
  align-items: stretch;
  gap: 6px;
}
/* While the bar is shown, the end of every screen scrolls above it. */
body.has-sheet-dock #app {
  padding-bottom: 120px;
}
</style>