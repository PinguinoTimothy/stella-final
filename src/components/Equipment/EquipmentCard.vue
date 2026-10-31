<script setup>
// One row of the equipment catalog. Same markup as the magic card, with equipment fields.
import { formatPrice, formatWeight } from '../../lib/equipment'
defineProps({ row: Object, readOnly: Boolean })
const emit = defineEmits(['details', 'add'])
</script>

<template>
  <article class="item-card ic" data-c="gear">
    <div class="ic-row">
      <button class="ic-main" type="button" @click="emit('details')">
        <span class="ti" aria-hidden="true">⚒</span>
        <span class="ic-tx">
          <span class="ic-t"><span>{{ row.name }}</span></span>
          <span class="ic-m">
            <span>{{ row.category || 'Equipment' }}</span>
            <span v-if="row.heading && row.heading !== row.name" class="tag">{{ row.heading }}</span>
          </span>
        </span>
      </button>
    </div>
    <div class="ic-use">
      <span class="ic-l cat-price">{{ formatPrice(row.price_gp) }} · {{ formatWeight(row.weight_lb) }}</span>
      <button v-if="!readOnly" class="cast" type="button" @click="emit('add')">Add</button>
    </div>
  </article>
</template>
