<script setup>
// A comma-separated list of spell names, each one tappable. Notes such as "(DC 16)" stay as plain text.
import { computed } from 'vue'
import RefLink from './RefLink.vue'
import { splitNames } from '../../lib/refs'
const props = defineProps({ list: { type: String, default: '' } })
const items = computed(() => splitNames(props.list))
</script>

<template>
  <span>
    <template
      v-for="(s, i) in items"
      :key="i"
    >
      <RefLink
        kind="spell"
        :name="s.name"
      />
      <span v-if="s.note"> {{ s.note }}</span>
      <span v-if="i < items.length - 1">, </span>
    </template>
  </span>
</template>
