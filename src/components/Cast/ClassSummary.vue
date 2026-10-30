<script setup>
// Class name, ability, modifier, and the 0–9 level bar with remaining slots.
import { abilityModifier, remaining, slotInfo } from '../../lib/spellcasting'
import { useCast } from '../../stores/cast'

const cast = useCast()
const label = (c, level) => (level === 0 ? '∞' : slotInfo(c, level) ? remaining(c, level) : '–')
</script>

<template>
  <section class="panel">
    <div class="lh">
      <div>
        <h2>{{ cast.characterClass.name }}</h2>
        <p class="mute">
          Nivel {{ cast.characterClass.lvl || '—' }} · Característica
          {{ String(cast.characterClass.ab || 'wis').toUpperCase() }}
          {{ cast.characterClass.score ?? 10 }}
          · Modificador {{ abilityModifier(cast.characterClass) >= 0 ? '+' : '' }}{{ abilityModifier(cast.characterClass) }}
        </p>
      </div>
    </div>

    <div class="lvbar">
      <button
        v-for="level in 10"
        :key="level - 1"
        class="lvb"
        :class="{ off: !slotInfo(cast.characterClass, level - 1) && level > 1 }"
        :aria-selected="cast.selectedLevel === level - 1"
        :disabled="level > 1 && !slotInfo(cast.characterClass, level - 1)"
        @click="cast.selectLevel(level - 1)"
      >
        <b>{{ level - 1 }}</b>
        <small>{{ label(cast.characterClass, level - 1) }}</small>
      </button>
    </div>
  </section>
</template>
