<script setup>
// More › Monster rules: universal monster rules (single-file version: vUmr).
import { computed, ref } from 'vue'
import { filterUmr, umrIsOpen } from '../lib/umr'
import BackButton from '../components/BackButton.vue'
import UmrFilters from '../components/Umr/UmrFilters.vue'
import UmrCard from '../components/Umr/UmrCard.vue'

const query = ref('')
const cat = ref('')
const opened = ref(null)
const list = computed(() => filterUmr(query.value, cat.value))
const toggle = (name) => { opened.value = opened.value === name ? null : name }
</script>

<template>
  <BackButton />
  <h2 class="pg">Monster rules</h2>
  <p class="mute">Universal monster rules: special abilities, defenses and traits. Search a rule or a word (“paralysis”, “DC”, “aura”), or filter by group.</p>
  <UmrFilters v-model:query="query" v-model:cat="cat" />
  <div>
    <UmrCard v-for="r in list" :key="r[0]" :rule="r" :open="umrIsOpen(r[0], opened, query, list.length)" @toggle="toggle(r[0])" />
    <section v-if="!list.length" class="panel item-empty">No rule matches.</section>
  </div>
  <p class="mute">Source: Archives of Nethys, Universal Monster Rules, condensed. “Mythic” rules need the Mythic Adventures rules.</p>
</template>
