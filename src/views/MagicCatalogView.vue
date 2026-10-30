<script setup>
import { computed, onMounted, ref, watch } from 'vue'

import { SB_ANON, fetchAll } from '../lib/supabase'
import { newItem } from '../lib/items'
import { useInventory } from '../stores/inventory'
import { useAppStore } from '../stores/app'

import MagicCatalogFilters from '../components/MagicCatalog/MagicCatalogFilters.vue'
import MagicCatalogList from '../components/MagicCatalog/MagicCatalogList.vue'
import MagicCatalogPager from '../components/MagicCatalog/MagicCatalogPager.vue'
import MagicItemDetails from '../components/MagicCatalog/MagicItemDetails.vue'
import {
  getMagicCatalogCache,
  setMagicCatalogCache,
} from '../lib/catalogCache'

const emit = defineEmits([
  'open-inventory',
  'open-cast',
  'open-active',
  'open-spells',
  'open-more',
])

const app = useAppStore()
const inv = useInventory()

const items = ref([])
const loading = ref(false)
const error = ref('')

const search = ref('')
const group = ref('')
const slot = ref('')
const sort = ref('default')

const detail = ref(null)
const page = ref(0)
const pageSize = 50

const readOnly = computed(() => app.viewer)

function priceValue(price) {
  const s = String(price || '').toLowerCase().replace(/,/g, '')
  const match = s.match(/(\d+(?:\.\d+)?)\s*(pp|gp|sp|cp)\b/i)

  if (!match) {
    const n = s.match(/(\d+(?:\.\d+)?)/)
    return n ? Number(n[1]) : null
  }

  return Number(match[1]) * ({
    pp: 10,
    gp: 1,
    sp: 0.1,
    cp: 0.01,
  })[match[2].toLowerCase()]
}

function normalizeItem(it) {
  const description = it.descr ?? it.desc ?? it.d ?? ''
  const source = it.source ?? it.src ?? ''

  return {
    id: it.id,
    n: it.name ?? it.n ?? '',
    aura: it.aura ?? '',
    cl: it.cl ?? '',
    slot: it.slot ?? '',
    price: it.price ?? '',
    weight: it.weight ?? '',
    d: description,
    desc: description,
    req: it.requirements ?? it.req ?? '',
    cost: it.cost ?? '',
    group: it.group_name ?? it.group ?? '',
    src: source,
    source,
    full: it.fulltext ?? it.full ?? '',
  }
}

async function loadCatalog() {
  loading.value = true
  error.value = ''

  try {
    const data = await fetchAll(
      SB_ANON,
      'magic_items',
      'select=*',
      'position',
    )

    items.value = data.map(normalizeItem)

    try {
  await setMagicCatalogCache(items.value)

    } catch {
      // La caché local es opcional.
    }
  } catch {
  try {
    const cached = await getMagicCatalogCache()

    if (Array.isArray(cached) && cached.length) {
      items.value = cached.map(normalizeItem)
      error.value = 'Showing saved catalog. Could not refresh from cloud.'
    } else {
      error.value = 'Could not load the magic catalog. Check your connection.'
    }
  } catch {
    error.value = 'Could not load the magic catalog.'
  }

  } finally {
    loading.value = false
  }
}

const groups = computed(() =>
  [...new Set(
    items.value
      .map((item) => item.group.trim())
      .filter(Boolean),
  )].sort(),
)

const slots = computed(() =>
  [...new Set(
    items.value
      .filter(
        (item) => item.group.trim().toLowerCase() === 'wondrous item',
      )
      .map((item) => item.slot.trim())
      .filter(Boolean),
  )].sort(),
)

const filtered = computed(() => {
  const query = search.value.trim().toLowerCase()

  const result = items.value.filter((item) => {
    if (group.value && item.group !== group.value) {
      return false
    }

    if (
      group.value.trim().toLowerCase() === 'wondrous item' &&
      slot.value &&
      item.slot.trim().toLowerCase() !== slot.value.toLowerCase()
    ) {
      return false
    }

    if (query) {
      const text = [
        item.n,
        item.slot,
        item.group,
        item.d,
        item.aura,
        item.src,
        item.req,
        item.price,
        item.cl,
        item.full,
      ].join(' ').toLowerCase()

      if (!text.includes(query)) {
        return false
      }
    }

    return true
  })

  if (sort.value !== 'default') {
    result.sort((a, b) => {
      const priceA = priceValue(a.price)
      const priceB = priceValue(b.price)

      if (priceA === null && priceB === null) return 0
      if (priceA === null) return 1
      if (priceB === null) return -1

      return sort.value === 'asc'
        ? priceA - priceB
        : priceB - priceA
    })
  }

  return result
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filtered.value.length / pageSize)),
)

const pageItems = computed(() =>
  filtered.value.slice(
    page.value * pageSize,
    (page.value + 1) * pageSize,
  ),
)

const entries = computed(() =>
  pageItems.value.map((item, index) => ({
    item,
    index,
    kind: item.group || 'Wondrous item',
  })),
)

watch([search, group, slot, sort], () => {
  page.value = 0
})

function changeGroup(value) {
  group.value = value
  slot.value = ''
}

function addToInventory(item) {
    if (app.viewer) return

  const kind = ['Rod', 'Staff', 'Wand', 'Scroll'].includes(item.group)
    ? item.group
    : 'Wondrous item'

  const inventoryItem = newItem({
    n: item.n,
    k: kind,
    slot: item.slot || '',
    price: priceValue(item.price) ?? 0,
    weight: Number.parseFloat(item.weight) || 0,
    aura: item.aura || '',
    icl: Number.parseInt(item.cl, 10) || 0,
    catalogId: String(item.id),
    o: [
      item.d,
      item.req && `Requirements: ${item.req}`,
      item.cost && `Cost: ${item.cost}`,
      item.src && `Source: ${item.src}`,
    ].filter(Boolean).join('\n\n'),
  })

  const ok = inv.add(inventoryItem)

  if (ok) {
    detail.value = null
    app.notify(`${item.n} added to inventory.`)
  }
}

function addPageItem(index) {
  const item = pageItems.value[index]
  if (item) addToInventory(item)
}

onMounted(loadCatalog)
</script>

<template>
  <main class="page magic-catalog-page">
<button class="back" type="button" @click="app.ui.tab = 'more'">
  ‹ More
</button>

    <header class="magic-catalog-heading">
      <p class="magic-eyebrow">PATHFINDER · EQUIPMENT</p>
      <h1 class="pg">Magic catalog</h1>
      <p class="mute">Browse magical items and add them to your inventory.</p>
    </header>

    <MagicCatalogFilters
      v-model:search="search"
      v-model:group="group"
      v-model:slot="slot"
      v-model:sort="sort"
      :groups="groups"
      :slots="slots"
    />

    <div class="magic-results-heading">
      <span>{{ filtered.length }} items found</span>
      <span v-if="totalPages > 1">
        {{ page + 1 }} / {{ totalPages }}
      </span>
    </div>

    <p v-if="loading" class="mute magic-status">
      Loading magic catalog…
    </p>

    <p v-if="error" class="mute magic-status" role="status">
      {{ error }}
    </p>

    <section
      v-if="!loading && !items.length"
      class="panel item-empty"
    >
      The magic catalog is not available yet.
    </section>

    <template v-else-if="items.length">
      <MagicCatalogList
        :entries="entries"
        :read-only="readOnly"
        @details="(index) => detail = pageItems[index]"
        @add="addPageItem"
      />

      <MagicCatalogPager
        :page="page"
        :pages="totalPages"
        @change="page = $event"
      />
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