<script setup>
defineProps({ title: { type: String, default: '' } })
</script>

<template>
  <section class="panel">
    <h2>{{ title }}</h2>
    <p class="mute">Not ported to Vue yet. The single-file version still has this screen, and both versions share the same cloud data, so you can switch between them. See the “Migration map” in the README.</p>
  </section>
</template>
