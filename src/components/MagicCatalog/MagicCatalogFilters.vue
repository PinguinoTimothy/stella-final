<script setup lang="ts">
defineProps<{ search: string; group: string; slot: string; sort: string; groups: string[]; slots: string[] }>()
const emit = defineEmits<{ 'update:search': [value: string]; 'update:group': [value: string]; 'update:slot': [value: string]; 'update:sort': [value: string] }>()
</script>
<template>
  <section class="magic-filters">
    <label class="magic-search"><span aria-hidden="true">⌕</span><input :value="search" type="search" placeholder="Search name, slot or description" aria-label="Search the catalog" @input="emit('update:search', ($event.target as HTMLInputElement).value)" /></label>
    <div class="magic-filter-grid">
      <label><span>Group</span><select :value="group" @change="emit('update:group', ($event.target as HTMLSelectElement).value)"><option value="">All groups</option><option v-for="value in groups" :key="value" :value="value">{{ value }}</option></select></label>
      <label><span>Sort by price</span><select :value="sort" @change="emit('update:sort', ($event.target as HTMLSelectElement).value)"><option value="default">Default order</option><option value="asc">Price: low to high</option><option value="desc">Price: high to low</option></select></label>
    </div>
    <label v-if="group.trim().toLowerCase() === 'wondrous item'"><span>Slot</span><select :value="slot" @change="emit('update:slot', ($event.target as HTMLSelectElement).value)"><option value="">All slots</option><option v-for="value in slots" :key="value" :value="value">{{ value }}</option></select></label>
  </section>
</template>
