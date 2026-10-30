<script setup lang="ts">
import MagicCatalogCard from './MagicCatalogCard.vue'
import type { MagicCatalogItem } from '../../types/inventory'
defineProps<{ entries: { item: MagicCatalogItem; index: number; kind: string }[]; readOnly: boolean }>()
const emit = defineEmits<{ details: [index: number]; add: [index: number] }>()
</script>
<template>
  <div v-if="entries.length" class="item-grid magic-item-grid"><MagicCatalogCard v-for="entry in entries" :key="entry.item.id || entry.index" :item="entry.item" :kind="entry.kind" :read-only="readOnly" @details="emit('details', entry.index)" @add="emit('add', entry.index)" /></div>
  <section v-else class="empty-state magic-empty"><span>✧</span><h2>No matching items</h2><p>Try another name, group or slot.</p></section>
</template>
