<script setup>
// More › Equipment catalog: browse mundane equipment and add it to the inventory.
// Only the visible page is loaded (see stores/equipmentCatalog.js).
import { computed, onMounted, ref } from 'vue';
import { toInventoryItem } from '../lib/equipment';
import { useAppStore } from '../stores/app';
import { useInventory } from '../stores/inventory';
import { useEquipmentCatalog } from '../stores/equipmentCatalog';
import MagicCatalogPager from '../components/MagicCatalog/MagicCatalogPager.vue';
import EquipmentFilters from '../components/Equipment/EquipmentFilters.vue';
import EquipmentList from '../components/Equipment/EquipmentList.vue';
import EquipmentDetails from '../components/Equipment/EquipmentDetails.vue';

const app = useAppStore();
const inv = useInventory();
const catalog = useEquipmentCatalog();

const detail = ref(null);
const readOnly = computed(() => app.viewer);
const entries = computed(() => catalog.rows.map((row, index) => ({ row, index })));
const empty = computed(() => !catalog.loading && !catalog.error && !catalog.rows.length && !catalog.total);

function addToInventory(row) {
  if (app.viewer) return;
  if (inv.add(toInventoryItem(row))) {
    detail.value = null;
    app.notify(`${row.name} added to inventory.`);
  }
}

onMounted(catalog.start);
</script>

<template>
  <main class="page magic-catalog-page" :aria-busy="catalog.loading">
    <header class="magic-catalog-heading">
      <h1 class="pg">Objetos mundanos</h1>
    </header>

    <EquipmentFilters
      v-model:search="catalog.search"
      v-model:category="catalog.category"
      v-model:sort="catalog.sort"
      :categories="catalog.categories"
    />

    <p v-if="catalog.loading" class="mute magic-status">Loading equipment…</p>

    <p v-if="catalog.error" class="mute magic-status" role="status">
      {{ catalog.error }}
      <button type="button" class="magic-retry" @click="catalog.retry()">Retry</button>
    </p>

    <section v-if="empty" class="panel item-empty">The equipment catalog is not available yet.</section>

    <template v-else-if="catalog.rows.length || catalog.total">
      <div :class="{ 'magic-stale': catalog.loading }">
        <EquipmentList
          :entries="entries"
          :read-only="readOnly"
          @details="i => (detail = catalog.rows[i])"
          @add="i => addToInventory(catalog.rows[i])"
        />
      </div>
      <MagicCatalogPager :page="catalog.page" :pages="catalog.totalPages" @change="catalog.page = $event" />
    </template>

    <EquipmentDetails
      v-if="detail"
      :row="detail"
      :read-only="readOnly"
      @close="detail = null"
      @add="addToInventory(detail)"
    />
  </main>
</template>
