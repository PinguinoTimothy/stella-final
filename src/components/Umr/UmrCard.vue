<script setup>
// One universal monster rule: name, type and group; the description when open.
defineProps({ rule: { type: Array, required: true }, open: Boolean })
defineEmits(['toggle'])
</script>

<template>
  <article class="cond" :class="{ on: open }">
    <button class="sk-h" :aria-expanded="open" @click="$emit('toggle')">
      <b>{{ rule[0] }}</b><span class="sk-t">{{ rule[1] }}{{ rule[2] === 'Mythic' ? ' · mythic' : '' }}</span>
    </button>
    <p v-if="open">{{ rule[3] }}</p>
  </article>
</template>
