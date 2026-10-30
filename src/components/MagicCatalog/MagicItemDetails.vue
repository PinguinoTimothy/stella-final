<script setup lang="ts">
import type { MagicCatalogItem } from '../../types/inventory'
defineProps<{ item: MagicCatalogItem; readOnly: boolean }>()
const emit = defineEmits<{ close: []; add: [] }>()
const fields = (item: MagicCatalogItem) => ([['Group',item.group],['Slot',item.slot],['Price',item.price],['Weight',item.weight],['Aura',item.aura],['Caster level',item.cl],['Requirements',item.req],['Cost',item.cost],['Source',item.src]] as [string,unknown][]).filter(([,value]) => String(value ?? '').trim() && !/^(none|—|-)$/i.test(String(value).trim()))
</script>
<template>
  <div class="modal-backdrop magic-modal" role="presentation" @click.self="emit('close')"><section class="magic-details" role="dialog" aria-modal="true" aria-label="Magic item details"><header><h2>{{ item.n }}</h2><button class="icon-button" type="button" aria-label="Close" @click="emit('close')">×</button></header><dl><template v-for="[label,value] in fields(item)" :key="label"><dt>{{ label }}</dt><dd>{{ value }}</dd></template></dl><p v-if="item.d" class="magic-description">{{ item.d }}</p><button v-if="!readOnly" class="primary magic-add-detail" type="button" @click="emit('add')">Add to inventory</button></section></div>
</template>
