<script setup>
// More › Skills: quick DCs and modifiers (single-file version: vSkills).
import { computed, ref } from 'vue'
import { filterSkills } from '../lib/skills'
import BackButton from '../components/BackButton.vue'
import SkillCard from '../components/Skills/SkillCard.vue'

const query = ref('')
const opened = ref(null)
const list = computed(() => filterSkills(query.value))
const searching = computed(() => !!query.value.trim())
const toggle = (name) => { opened.value = opened.value === name ? null : name }
</script>

<template>
  <BackButton />
  <h2 class="pg">Skills</h2>
  <p class="mute">Quick DCs and modifiers. Search a DC, a number or a situation (“ladder”, “manacles”, “wind”), or tap a skill.</p>
  <input v-model="query" class="sr" placeholder="Search skills and DCs…" aria-label="Search skills">
  <div>
    <SkillCard v-for="s in list" :key="s.name" :skill="s" :open="searching || opened === s.name" @toggle="toggle(s.name)" />
    <section v-if="!list.length" class="panel item-empty">No skill matches.</section>
  </div>
  <p class="mute">Source: Archives of Nethys skill pages, condensed. Check your book for edge cases.</p>
</template>
