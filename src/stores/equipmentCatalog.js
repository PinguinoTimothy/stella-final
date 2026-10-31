// Equipment catalog screen: filters, the current page and how it is fetched.
// Only the visible page is downloaded; sorting by price runs on the server (see equipment_catalog).
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { fetchEquipmentCategories, fetchEquipmentPage } from '../lib/supabase'
import { PAGE_SIZE } from '../lib/equipment'

const DEBOUNCE = 300
const MAX_CACHED = 40

export const useEquipmentCatalog = defineStore('equipmentCatalog', () => {
  const search = ref('')
  const category = ref('')
  const sort = ref('name')            // 'name' | 'asc' | 'desc' (price)
  const page = ref(0)

  const rows = ref([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref('')
  const categories = ref([])

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

  let controller = null, request = 0, timer = 0, started = false, resetting = false
  const pages = new Map()             // filter+page → { rows, total }

  const keyOf = () => JSON.stringify([search.value.trim().toLowerCase(), category.value, sort.value, page.value])

  function remember(key, value) {
    pages.set(key, value)
    if (pages.size > MAX_CACHED) pages.delete(pages.keys().next().value)
  }

  /** Loads the page for the current filters. A newer call cancels the one still running. */
  async function load() {
    const mine = ++request
    controller?.abort()
    controller = new AbortController()
    const key = keyOf()

    if (pages.has(key)) {
      const hit = pages.get(key)
      rows.value = hit.rows; total.value = hit.total; error.value = ''; loading.value = false
      return
    }

    loading.value = true; error.value = ''
    try {
      const result = await fetchEquipmentPage({
        query: search.value,
        category: category.value,
        sort: sort.value,
        offset: page.value * PAGE_SIZE,
        limit: PAGE_SIZE,
        signal: controller.signal,
      })
      if (mine !== request) return
      remember(key, result)
      rows.value = result.rows; total.value = result.total
    } catch (e) {
      if (mine !== request || e?.name === 'AbortError') return
      error.value = rows.value.length
        ? 'Could not refresh the catalog. Showing the previous results.'
        : 'Could not load the equipment catalog. Check your connection.'
    } finally {
      if (mine === request) loading.value = false
    }
  }

  async function loadCategories() {
    try { categories.value = await fetchEquipmentCategories() } catch { /* the filter stays empty */ }
  }

  function start() {
    if (started) { load(); return }
    started = true
    load(); loadCategories()
    // A new filter goes back to page 1; typing waits for a pause so it doesn't send a request per key.
    watch([search, category, sort], () => {
      clearTimeout(timer)
      if (page.value !== 0) { resetting = true; page.value = 0 }
      timer = setTimeout(load, DEBOUNCE)
    })
    watch(page, () => {
      if (resetting) { resetting = false; return }
      clearTimeout(timer); load()
    })
  }

  function retry() { pages.clear(); load() }

  return { search, category, sort, page, rows, total, totalPages, loading, error, categories, start, retry }
})
