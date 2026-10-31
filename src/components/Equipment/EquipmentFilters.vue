<script setup>
// Search box, category and price sort for the equipment catalog. Same look as the magic filters.
defineProps({ search: String, category: String, sort: String, categories: Array })
const emit = defineEmits(['update:search', 'update:category', 'update:sort'])
const value = (event) => event.target.value
</script>

<template>
  <section class="magic-filters">
    <label class="magic-search">
      <span aria-hidden="true">⌕</span>
      <input :value="search" type="search" placeholder="Search name, category or heading" aria-label="Search the equipment catalog" @input="emit('update:search', value($event))" />
    </label>
    <div class="magic-filter-grid">
      <label>
        <span>Category</span>
        <select :value="category" @change="emit('update:category', value($event))">
          <option value="">All categories</option>
          <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>
      <label>
        <span>Sort by price</span>
        <select :value="sort" @change="emit('update:sort', value($event))">
          <option value="name">Name (A–Z)</option>
          <option value="asc">Price: low to high</option>
          <option value="desc">Price: high to low</option>
        </select>
      </label>
    </div>
  </section>
</template>
