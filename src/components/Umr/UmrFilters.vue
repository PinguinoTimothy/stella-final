<script setup>
// Search box + group chips.
import { UMRC } from '../../lib/umr'
const query = defineModel('query', { type: String, default: '' })
const cat = defineModel('cat', { type: String, default: '' })
</script>

<template>
  <input v-model="query" class="sr" placeholder="Search monster rules…" aria-label="Search monster rules">
  <div class="chips">
    <button v-for="[id, label] in UMRC" :key="id" class="chip" :aria-selected="cat === id" @click="cat = id">{{ label }}</button>
  </div>
</template>
