<script setup>
// Shows the open sheet above the bottom bar when it is minimized (or closed but still selected): one tap opens it.
import { computed } from 'vue';
import { useSheetsStore } from '../../stores/sheets';

const sheets = useSheetsStore();
const show = computed(() => !!sheets.current && sheets.panel !== 'open');
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
