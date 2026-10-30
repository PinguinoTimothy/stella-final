<script setup>
// "Buffs" or "Debuffs" block. Renders nothing when empty.
import { computed } from 'vue'
import { fxCmp } from '../../lib/effects'
import FxRow from './FxRow.vue'

const props = defineProps({ title: String, effects: { type: Array, required: true }, openId: { type: String, default: null } })
defineEmits(['toggle'])
const sorted = computed(() => props.effects.slice().sort(fxCmp))
</script>

<template>
  <section v-if="sorted.length" class="panel flat">
    <h2>{{ title }}</h2>
    <FxRow v-for="e in sorted" :key="e.id" :effect="e" :open="openId === e.id" @toggle="$emit('toggle', e.id)" />
  </section>
</template>
