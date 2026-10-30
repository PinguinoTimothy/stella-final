<script setup>
// DC rows of one section: the number in a badge on the left, the situation on the right.
defineProps({ items: { type: Array, required: true } })
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
</script>

<template>
  <div class="dcl">
    <template v-for="(x, i) in items" :key="i">
      <div v-if="x.t !== undefined" class="dcp">{{ x.t }}</div>
      <div v-else class="dcr">
        <span class="dcv"><b>{{ x.v }}</b><small v-if="x.x">{{ x.x }}</small></span>
        <span class="dcw">{{ cap(x.l) }}<small v-if="x.n"> {{ x.n }}</small></span>
      </div>
    </template>
  </div>
</template>
