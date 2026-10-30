<script setup>
// One skill: header with name and tags; when open, its sections of DCs and modifiers.
import SkillRows from './SkillRows.vue'
defineProps({ skill: { type: Object, required: true }, open: Boolean })
defineEmits(['toggle'])
</script>

<template>
  <article class="cond" :class="{ on: open }">
    <button class="sk-h" :aria-expanded="open" @click="$emit('toggle')">
      <b>{{ skill.name }}</b><span class="sk-t">{{ skill.tags.join(' · ') }}</span>
    </button>
    <template v-if="open">
      <template v-for="sec in skill.sections" :key="sec[0]">
        <div class="sk-st">{{ sec[0] }}</div>
        <SkillRows :items="sec[1]" />
      </template>
    </template>
  </article>
</template>
