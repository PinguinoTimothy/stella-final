<script setup>
// Plain text where condition names (frightened, shaken…) are tappable.
import { computed } from 'vue'
import RefLink from './RefLink.vue'
import { textParts } from '../../lib/refs'
const props = defineProps({ text: { type: String, default: '' } })
const parts = computed(() => textParts(props.text))
</script>

<template>
  <span>
    <template
      v-for="(p, i) in parts"
      :key="i"
    >
      <RefLink
        v-if="p.condition"
        kind="condition"
        :name="p.text"
      />
      <template v-else>{{ p.text }}</template>
    </template>
  </span>
</template>
