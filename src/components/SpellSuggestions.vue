<script setup>
// Dropdown of spells under a name field. One row per spell, with a divider between rows.
// `meta` is what the right side shows: the spell level, or the duration.
import { computed } from 'vue'
import { lowestSpellLevel } from '../lib/spellcasting'

const props = defineProps({
  items: { type: Array, default: () => [] },
  meta: { type: String, default: 'level' },   // 'level' | 'duration'
})
const emit = defineEmits(['pick'])

const label = (s) => {
  if (props.meta === 'duration') return s.dur || 'Duration unknown'
  const lv = lowestSpellLevel(s.lv)
  return lv === null ? '' : `Lvl ${lv}`
}
</script>

<template>
  <ul v-if="items.length" class="spell-suggestions" aria-label="Matching spells">
    <li v-for="s in items" :key="s.n">
      <button type="button" class="spell-option" @click="emit('pick', s)">
        <span class="spell-option-name">{{ s.n }}</span>
        <span v-if="label(s)" class="spell-option-meta">{{ label(s) }}</span>
      </button>
    </li>
  </ul>
</template>

<style scoped>
.spell-suggestions {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  max-height: 260px;
  overflow-y: auto;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
}
.spell-suggestions li + li { border-top: 1px solid var(--line); }
.spell-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  background: none;
  border: 0;
  border-radius: 0;
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.spell-option:hover, .spell-option:focus-visible { background: var(--raise); outline: none; }
.spell-option-name { font-weight: 600; }
.spell-option-meta { color: var(--mute); font-size: 0.9em; text-align: right; }
</style>
