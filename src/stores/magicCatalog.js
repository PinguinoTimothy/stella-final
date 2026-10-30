// Magic catalog screen: the filters, the current page and how it is fetched.
// Only the visible page is downloaded. Filters run on the server; sorting by price uses a light id+price index.
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { fetchMagicByIds, fetchMagicFacets, fetchMagicPage, fetchMagicPriceIndex } from '../lib/supabase'
import { getMagicFacetsCache, setMagicFacetsCache } from '../lib/catalogCache'
import { normalizeItem, PAGE_SIZE, sortByPrice } from '../lib/magic'

const DEBOUNCE = 300
const MAX_CACHED = 40   // pages kept in memory so going back and forth is instant

export const useMagicCatalog = defineStore('magicCatalog', () => {
  const search = ref('')
  const group = ref('')
  const slot = ref('')
  const sort = ref('default')
  const page = ref(0)

  const rows = ref([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref('')
  const facets = ref({ groups: [], slots: [] })

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

  let controller = null, request = 0, timer = 0, started = false, resetting = false
  const pages = new Map()           // filter+page → { rows, total }
  const priceIndexes = new Map()    // filter → [{ id, price }] sorted

  const filterKey = () => JSON.stringify([search.value.trim().toLowerCase(), group.value, slot.value])
  const filters = () => ({ query: search.value, group: group.value, slot: slot.value })

  function remember(key, value) {
    pages.set(key, value)
    if (pages.size > MAX_CACHED) pages.delete(pages.keys().next().value)
  }

  /** Sorted ids of everything that matches, by price. Fetched once per filter. */
  async function sortedIndex(signal) {
    const key = filterKey() + sort.value
    if (!priceIndexes.has(key)) priceIndexes.set(key, sortByPrice(await fetchMagicPriceIndex({ ...filters(), signal }), sort.value))
    return priceIndexes.get(key)
  }

  async function fetchPage(signal) {
    if (sort.value === 'default') {
      const r = await fetchMagicPage({ ...filters(), offset: page.value * PAGE_SIZE, limit: PAGE_SIZE, signal })
      return { rows: r.rows.map(normalizeItem), total: r.total }
    }
    const index = await sortedIndex(signal)
    const ids = index.slice(page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE).map((x) => x.id)
    const byId = new Map((await fetchMagicByIds(ids, signal)).map((r) => [r.id, r]))
    return { rows: ids.map((id) => byId.get(id)).filter(Boolean).map(normalizeItem), total: index.length }
  }

  /** Loads the page for the current filters. A newer call cancels the one still running. */
  async function load() {
    const mine = ++request
    controller?.abort()
    controller = new AbortController()
    const key = `${filterKey()}|${sort.value}|${page.value}`

    if (pages.has(key)) {
      const hit = pages.get(key)
      rows.value = hit.rows; total.value = hit.total; error.value = ''; loading.value = false
      return
    }

    loading.value = true; error.value = ''
    try {
      const result = await fetchPage(controller.signal)
      if (mine !== request) return
      remember(key, result)
      rows.value = result.rows; total.value = result.total
    } catch (e) {
      if (mine !== request || e?.name === 'AbortError') return
      error.value = rows.value.length
        ? 'Could not refresh the catalog. Showing the previous results.'
        : 'Could not load the magic catalog. Check your connection.'
    } finally {
      if (mine === request) loading.value = false
    }
  }

  /** The Group and Slot lists: the saved copy first, then fresh from the cloud. */
  async function loadFacets() {
    try { const saved = await getMagicFacetsCache(); if (saved?.groups) facets.value = saved } catch { /* optional */ }
    try {
      facets.value = await fetchMagicFacets()
      setMagicFacetsCache(facets.value).catch(() => {})
    } catch { /* keeps the saved lists */ }
  }

  function start() {
    if (started) { load(); return }
    started = true
    load(); loadFacets()
    // A new filter goes back to page 1; typing waits for a pause so it doesn't send a request per key.
    watch([search, group, slot, sort], () => {
      clearTimeout(timer)
      if (page.value !== 0) { resetting = true; page.value = 0 }
      timer = setTimeout(load, DEBOUNCE)
    })
    watch(page, () => {
      if (resetting) { resetting = false; return }   // already covered by the debounced load above
      clearTimeout(timer); load()
    })
  }

  function changeGroup(value) { group.value = value; slot.value = '' }
  function retry() { pages.clear(); priceIndexes.clear(); load() }

  return { search, group, slot, sort, page, rows, total, totalPages, loading, error, facets, start, changeGroup, retry }
})
