<script setup>
// "Nivel N", slots left of total, and the save DC.
import { computed } from 'vue'
import { remaining, slotInfo, spellDC } from '../../lib/spellcasting'
import { useCast } from '../../stores/cast'

const props = defineProps({ level: { type: Number, required: true } })
const cast = useCast()
const c = computed(() => cast.characterClass)
const slots = computed(() => slotInfo(c.value, props.level))
</script>

<template>
  <div class="lh">
    <div>
      <h2>{{ level === 0 ? 'Trucos / nivel 0' : `Nivel ${level}` }}</h2>
      <p class="mute">
        <template v-if="slots.atWill">A voluntad</template>
        <template v-else>
          {{ remaining(c, level) }} de {{ slots.total }} espacios restantes
          <span v-if="slots.bonus">· {{ slots.base }} base + {{ slots.bonus }} bonificación</span>
        </template>
      </p>
    </div>

    <div class="dcb">
      <small>CD</small>
      <b>{{ spellDC(c, level) }}</b>
    </div>
  </div>
</template>
