<script setup>
// The spells shown for a level: prepared/known ones when casting, the whole class list when preparing.
import { computed } from 'vue'
import { knownSpells, visibleSpells } from '../../lib/spellcasting'
import { useCast } from '../../stores/cast'
import SpellRow from './SpellRow.vue'

const props = defineProps({ level: { type: Number, required: true } })
const cast = useCast()
const list = computed(() => {
  const c = cast.characterClass
  return cast.prepareMode && c.all ? knownSpells(c, props.level) : visibleSpells(c, props.level, cast.prepareMode)
})
</script>

<template>
  <div class="spell-list">
    <p v-if="!list.length" class="mute">
      {{ cast.prepareMode ? 'No hay conjuros registrados en este nivel.' : 'No hay conjuros preparados o conocidos en este nivel.' }}
    </p>
    <SpellRow v-for="spell in list" :key="spell.n" :level="level" :spell="spell" />
  </div>
</template>
