<script setup>
// Active tab: buffs and debuffs with durations (single-file version: vFx).
import { computed, ref } from 'vue'
import { useAppStore } from '../stores/app'
import FxSummary from '../components/Active/FxSummary.vue'
import FxForm from '../components/Active/FxForm.vue'
import FxGroup from '../components/Active/FxGroup.vue'

const app = useAppStore()
const openId = ref(null)
const toggle = (id) => { openId.value = openId.value === id ? null : id }
const adding = computed(() => !!app.ui.fxAdd)
const closeForm = () => { app.ui.fxAdd = false; app.ui.fxPrefill = null }
const toggleForm = () => { app.ui.fxAdd = !app.ui.fxAdd; app.ui.fxPrefill = null }
const buffs = computed(() => app.S.fx.filter((e) => e.k === 'buff'))
const debuffs = computed(() => app.S.fx.filter((e) => e.k === 'debuff'))
</script>

<template>
  <FxSummary :adding="adding" @toggle-add="toggleForm" />
  <FxForm v-if="adding" :key="app.ui.fxPrefill ? app.ui.fxPrefill.n : 'new'" :prefill="app.ui.fxPrefill" @done="closeForm" />
  <FxGroup title="Buffs" :effects="buffs" :open-id="openId" @toggle="toggle" />
  <FxGroup title="Debuffs" :effects="debuffs" :open-id="openId" @toggle="toggle" />
  <p v-if="!app.S.fx.length && !adding" class="mute">Nothing running. Cast a spell and tap Track, or add an effect by hand.</p>
</template>
