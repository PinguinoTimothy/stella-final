<script setup>
// Filter chips: All, Spells, Items, Money, Rests.
import { HISTORY_FILTERS } from '../../lib/history'
const kind = defineModel({ type: String, default: '' })
</script>

<template>
  <div class="chips">
    <button v-for="[id, label] in HISTORY_FILTERS" :key="id" class="chip" :aria-selected="kind === id" @click="kind = id">{{ label }}</button>
  </div>
</template>
