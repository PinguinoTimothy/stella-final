<script setup>
// Read-only effect row for players: name, targets, remaining time and a progress bar.
import { computed } from 'vue'
import { fmtR, fxPct } from '../../lib/effects'

const props = defineProps({ effect: { type: Object, required: true } })
const e = computed(() => props.effect)
const expired = computed(() => e.value.rem === 0)
const targets = computed(() => (e.value.targets && e.value.targets.length) ? e.value.targets : (e.value.tg ? [e.value.tg] : []))
const time = computed(() => e.value.rem === null ? 'no limit' : expired.value ? 'Expired' : fmtR(e.value.rem))
</script>

<template>
  <div class="fx" :class="[e.k, { exp: expired }]">
    <div class="row">
      <span class="fxn">
        <b>{{ e.n }}</b>
        <span v-if="targets.length" class="fxg"><span v-for="t in targets" :key="t" class="tag">{{ t }}</span></span>
      </span>
      <span class="fxt">{{ time }}</span>
    </div>
    <div class="bar"><i :style="{ width: fxPct(e) + '%' }" /></div>
  </div>
</template>
