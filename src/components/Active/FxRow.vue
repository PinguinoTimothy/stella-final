<script setup>
// One active effect: name, remaining time, progress bar. Tap the name to open details, notes and time adjustments.
import { computed, watch } from 'vue'
import { useEffects } from '../../stores/effects'
import { useSpells } from '../../stores/spells'
import { fmtR, fxPct } from '../../lib/effects'
import SpellInfo from '../SpellInfo.vue'

const props = defineProps({ effect: { type: Object, required: true }, open: Boolean })
defineEmits(['toggle'])

const fx = useEffects()
const spells = useSpells()
const e = computed(() => props.effect)
const expired = computed(() => e.value.rem === 0)
const spell = computed(() => spells.find(e.value.n))
watch(() => props.open, (o) => { if (o) spells.ensure([e.value.n]) }, { immediate: true })
const time = computed(() => e.value.rem === null ? 'no limit' : expired.value ? 'Expired' : fmtR(e.value.rem))
</script>

<template>
  <div class="fx" :class="[e.k, { exp: expired }]">
    <div class="row">
      <button class="nm" :aria-expanded="open" @click="$emit('toggle')">
        {{ e.n }}
        <span v-if="e.targets && e.targets.length" class="tag">{{ e.targets.length }} targets</span>
        <span v-else-if="e.tg" class="tag">{{ e.tg }}</span>
      </button>
      <span class="fxt">{{ time }}</span>
      <button class="danger fx-end" :aria-label="'End ' + e.n" @click="fx.end(e)">×</button>
    </div>
    <div class="bar"><i :style="{ width: fxPct(e) + '%' }" /></div>

    <template v-if="open">
      <div v-if="spell" class="detail"><SpellInfo :spell="spell" /></div>
      <div class="detail">
        <template v-if="e.targets && e.targets.length">
          <div class="mute">Targets</div>
          <div class="grid"><div v-for="t in e.targets" :key="t" class="tag">{{ t }}</div></div>
        </template>
        <input v-else v-model="e.tg" placeholder="Target" aria-label="Target">

        <textarea v-model="e.note" rows="2" placeholder="Notes" aria-label="Notes" />

        <div v-if="e.rem !== null" class="row">
          <span>Adjust time (rounds)</span>
          <span class="step">
            <button aria-label="Minus 1 round" @click="fx.adjust(e, -1)">−1</button>
            <button aria-label="Plus 1 round" @click="fx.adjust(e, 1)">+1</button>
            <button aria-label="Plus 1 minute" @click="fx.adjust(e, 10)">+10</button>
          </span>
        </div>
        <div class="row">
          <span class="mute">Cast at CL {{ e.cl || 1 }}</span>
          <button @click="fx.toggleKind(e)">Move to {{ e.k === 'buff' ? 'debuffs' : 'buffs' }}</button>
        </div>
      </div>
    </template>
  </div>
</template>
