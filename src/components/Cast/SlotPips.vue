<script setup>
// The round buttons for a level's slots. Tap a spent one to restore it, a free one to spend it. Domain slots are the "d" ones.
import { computed } from 'vue'
import { domainUsed, regularUsed, slotInfo } from '../../lib/spellcasting'
import { useCast } from '../../stores/cast'

const props = defineProps({ level: { type: Number, required: true } })
const cast = useCast()
const c = computed(() => cast.characterClass)
const slots = computed(() => slotInfo(c.value, props.level))
const playing = (kind, index) => cast.castingSlot === `${cast.classIndex}:${props.level}:${kind}:${index - 1}`
</script>

<template>
  <div class="slots">
    <button
      v-for="index in slots.regular"
      :key="`regular-${index}`"
      class="pip"
      :class="{ spent: index <= regularUsed(c, level), pl: playing('r', index) }"
      :aria-label="`Espacio normal ${index}`"
      @click="cast.setSlotUsed(c, level, index - 1)"
    />
    <button
      v-for="index in slots.domain"
      :key="`domain-${index}`"
      class="pip d"
      :class="{ spent: index <= domainUsed(c, level), pl: playing('d', index) }"
      aria-label="Espacio de dominio"
      @click="cast.setSlotUsed(c, level, index - 1, true)"
    />
  </div>
</template>

<style scoped>
.pip.pl { position: relative; z-index: 1; animation: pulse 0.34s ease-out; }
@keyframes pulse {
  0% { transform: scale(1); box-shadow: 0 0 0 0 var(--cast-glow); }
  50% { transform: scale(1.3); box-shadow: 0 0 12px 4px var(--cast-glow); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 transparent; }
}
</style>
