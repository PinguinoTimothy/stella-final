<script setup>
import EquipmentCard from './EquipmentCard.vue'
defineProps({ entries: Array, readOnly: Boolean })
const emit = defineEmits(['details', 'add'])
</script>

<template>
  <div v-if="entries.length" class="item-grid magic-item-grid">
    <EquipmentCard
      v-for="entry in entries"
      :key="entry.row.id"
      :row="entry.row"
      :read-only="readOnly"
      @details="emit('details', entry.index)"
      @add="emit('add', entry.index)"
    />
  </div>
  <section v-else class="empty-state magic-empty">
    <span>⚒</span>
    <h2>No matching equipment</h2>
    <p>Try another name or category.</p>
  </section>
</template>
