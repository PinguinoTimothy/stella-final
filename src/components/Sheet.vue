<script setup>
// Bottom sheet. Tapping the dark backdrop or × closes it.
import { nextTick, onBeforeUnmount, onMounted } from 'vue'
defineProps({ title: { type: String, default: '' } })
defineEmits(['close'])
const sync = () => document.body.classList.toggle('lock', !!document.querySelector('.sheet-bd'))
onMounted(() => nextTick(sync))
onBeforeUnmount(() => nextTick(sync))
</script>

<template>
  <div class="sheet-bd" @click.self="$emit('close')">
    <section class="sheet" role="dialog" aria-modal="true" :aria-label="title">
      <div class="row sh">
        <h2>{{ title }}</h2>
        <button class="x" aria-label="Close" @click="$emit('close')">×</button>
      </div>
      <slot />
    </section>
  </div>
</template>
