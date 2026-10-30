<script setup>
// More › Magic catalog: browse magic items and add them to the inventory.
// Only the visible page is loaded (see stores/magicCatalog.js).
import { computed, onMounted, ref } from 'vue'
import { toInventoryItem } from '../lib/magic'
import { useAppStore } from '../stores/app'
import { useInventory } from '../stores/inventory'
import { useMagicCatalog } from '../stores/magicCatalog'
import BackButton from '../components/BackButton.vue'
import MagicCatalogFilters from '../components/MagicCatalog/MagicCatalogFilters.vue'
import MagicCatalogList from '../components/MagicCatalog/MagicCatalogList.vue'
import MagicCatalogPager from '../components/MagicCatalog/MagicCatalogPager.vue'
import MagicItemDetails from '../components/MagicCatalog/MagicItemDetails.vue'

const app = useAppStore()
const inv = useInventory()
const catalog = useMagicCatalog()

const detail = ref(null)
const readOnly = computed(() => app.viewer)
const entries = computed(() => catalog.rows.map((item, index) => ({ item, index, kind: item.group || 'Wondrous item' })))
const empty = computed(() => !catalog.loading && !catalog.error && !catalog.rows.length && !catalog.total)

function addToInventory(item) {
  if (app.viewer) return
  if (inv.add(toInventoryItem(item))) {
    detail.value = null
    app.notify(`${item.n} added to inventory.`)
  }
}

onMounted(catalog.start)
</script>

<template>
  <main class="page magic-catalog-page" :aria-busy="catalog.loading">
    <BackButton />

    <header class="magic-catalog-heading">
      <p class="magic-eyebrow">PATHFINDER · EQUIPMENT</p>
      <h1 class="pg">Magic catalog</h1>
      <p class="mute">Browse magical items and add them to your inventory.</p>
    </header>

    <MagicCatalogFilters
      v-model:search="catalog.search"
      :group="catalog.group"
      v-model:slot="catalog.slot"
      v-model:sort="catalog.sort"
      :groups="catalog.facets.groups"
      :slots="catalog.facets.slots"
      @update:group="catalog.changeGroup"
    />

    <div class="magic-results-heading">
      <span>{{ catalog.total }} items found</span>
      <span v-if="catalog.totalPages > 1">{{ catalog.page + 1 }} / {{ catalog.totalPages }}</span>
    </div>

    <p v-if="catalog.loading" class="mute magic-status">Loading magic catalog…</p>

    <p v-if="catalog.error" class="mute magic-status" role="status">
      {{ catalog.error }}
      <button type="button" class="magic-retry" @click="catalog.retry()">Retry</button>
    </p>

    <section v-if="empty" class="panel item-empty">The magic catalog is not available yet.</section>

    <template v-else-if="catalog.rows.length || catalog.total">
      <div :class="{ 'magic-stale': catalog.loading }">
        <MagicCatalogList :entries="entries" :read-only="readOnly" @details="(i) => detail = catalog.rows[i]" @add="(i) => addToInventory(catalog.rows[i])" />
      </div>
      <MagicCatalogPager :page="catalog.page" :pages="catalog.totalPages" @change="catalog.page = $event" />
    </template>

    <MagicItemDetails v-if="detail" :item="detail" :read-only="readOnly" @close="detail = null" @add="addToInventory(detail)" />
  </main>
</template>
