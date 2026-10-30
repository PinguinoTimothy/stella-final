<script setup>
// Search box shared by the "add spell" catalogs.
const model = defineModel({ type: String, default: '' })
defineProps({ placeholder: { type: String, default: 'Buscar...' } })
</script>

<template>
  <input v-model="model" type="search" :placeholder="placeholder" class="known-catalog-search">
</template>

<style scoped>
.known-catalog-search {
  width: 150px;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid rgba(110, 160, 185, 0.25);
  border-radius: 9px;
  background: rgba(5, 15, 23, 0.65);
  color: inherit;
  font: inherit;
  font-size: 0.82rem;
}
.known-catalog-search:focus { outline: none; border-color: #65b8ff; }
</style>
