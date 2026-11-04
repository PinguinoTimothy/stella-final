<script setup>
// More › Magic catalog: browse magic items and add them to the inventory.
// Items load a page at a time as the list is scrolled (see stores/magicCatalog.js).
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { toInventoryItem } from '../lib/magic';
import { useAppStore } from '../stores/app';
import { useInventory } from '../stores/inventory';
import { useMagicCatalog } from '../stores/magicCatalog';
import BackButton from '../components/BackButton.vue';
import MagicCatalogFilters from '../components/MagicCatalog/MagicCatalogFilters.vue';
import MagicCatalogList from '../components/MagicCatalog/MagicCatalogList.vue';
import MagicItemDetails from '../components/MagicCatalog/MagicItemDetails.vue';

const app = useAppStore();
const inv = useInventory();
const catalog = useMagicCatalog();

const detail = ref(null);
const readOnly = computed(() => app.viewer);
const entries = computed(() =>
  catalog.rows.map((item, index) => ({ item, index, kind: item.group || 'Wondrous item' })),
);
const empty = computed(() => !catalog.loading && !catalog.error && !catalog.rows.length && !catalog.total);

// The sentinel sits under the last item. When it comes into view (or is already close), the next page loads.
const sentinel = ref(null);
let observer = null;

function nearEnd() {
  const el = sentinel.value;
  if (!el || !catalog.hasMore || catalog.loading) return;
  if (el.getBoundingClientRect().top < window.innerHeight + 300) catalog.loadMore();
}

function addToInventory(item) {
  if (app.viewer) return;
  if (inv.add(toInventoryItem(item))) {
    detail.value = null;
    app.notify(`${item.n} added to inventory.`);
  }
}

// A page that loads while the sentinel is still in view does not produce a new intersection event,
// so check again whenever the list grows.
watch(
  () => catalog.rows.length,
  () => nextTick(nearEnd),
);

watch(sentinel, (el, old) => {
  if (old) observer?.unobserve(old);
  if (el) observer?.observe(el);
});

onMounted(() => {
  catalog.start();
  observer = new IntersectionObserver(
    entries => {
      if (entries.some(e => e.isIntersecting)) catalog.loadMore();
    },
    { rootMargin: '300px 0px' },
  );
  if (sentinel.value) observer.observe(sentinel.value);
});

onBeforeUnmount(() => observer?.disconnect());
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
      v-model:slot="catalog.slot"
      v-model:sort="catalog.sort"
      :group="catalog.group"
      :groups="catalog.facets.groups"
      :slots="catalog.facets.slots"
      @update:group="catalog.changeGroup"
    />

    <div class="magic-results-heading">
      <span>{{ catalog.total }} items found</span>
      <span v-if="catalog.rows.length && catalog.hasMore">Showing {{ catalog.rows.length }}</span>
    </div>

    <p v-if="catalog.loading && !catalog.appending" class="mute magic-status">Loading magic catalog…</p>

    <p v-if="catalog.error" class="mute magic-status" role="status">
      {{ catalog.error }}
      <button type="button" class="magic-retry" @click="catalog.retry()">Retry</button>
    </p>

    <section v-if="empty" class="panel item-empty">The magic catalog is not available yet.</section>

    <template v-else-if="catalog.rows.length || catalog.total">
      <div :class="{ 'magic-stale': catalog.loading && !catalog.appending }">
        <MagicCatalogList
          :entries="entries"
          :read-only="readOnly"
          @details="i => (detail = catalog.rows[i])"
          @add="i => addToInventory(catalog.rows[i])"
        />
      </div>
      <p v-if="catalog.appending" class="mute magic-status">Loading more…</p>
      <div ref="sentinel" class="magic-sentinel" aria-hidden="true"></div>
    </template>

    <MagicItemDetails
      v-if="detail"
      :item="detail"
      :read-only="readOnly"
      @close="detail = null"
      @add="addToInventory(detail)"
    />
  </main>
</template>
