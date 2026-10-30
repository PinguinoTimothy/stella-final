
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAppStore } from './app'
import {
  fetchSpellCatalogPage,
  fetchSpellRatings,
} from '../lib/supabase'
import { SEED } from '../lib/spellSeed'

const PAGE_SIZE = 50

const seedSpells = () => SEED.map(a => ({
  n: a[0], s: a[1], lv: a[2], ct: a[3], rng: a[4],
  dur: a[5], sv: a[6], sr: a[7], d: a[8]
}))

export const useSpells = defineStore('spells', () => {
  const app = useAppStore()

  const imported = ref([])
  const loading = ref(false)
  const loadingMore = ref(false)
  const error = ref('')

  const total = ref(0)
  const hasMore = ref(true)
  const ratings = ref([])

  const filters = ref({
    query: '',
    school: '',
    classAliases: [],
    level: '',
    rating: '',
  })

  let requestId = 0

  const all = computed(() => {
    const catalog = imported.value.length
      ? imported.value
      : seedSpells()

    return catalog.concat(app.S.db || [])
  })

  const index = computed(() => {
    const result = {}

    all.value.forEach(spell => {
      const key = String(spell.n || '').toLowerCase()
      if (key && !result[key]) result[key] = spell
    })

    return result
  })

  async function loadRatings() {
    try {
      ratings.value = await fetchSpellRatings()
    } catch (e) {
      console.error('Error loading spell ratings:', e)
    }
  }

  async function load(reset = true) {
    if (loadingMore.value) return

    if (reset) {
      requestId++
      imported.value = []
      total.value = 0
      hasMore.value = true
      loading.value = true
      error.value = ''
    } else {
      if (!hasMore.value || loading.value) return
      loadingMore.value = true
    }

    const currentRequest = requestId
    const offset = reset ? 0 : imported.value.length

    try {
      const result = await fetchSpellCatalogPage({
        offset,
        limit: PAGE_SIZE,
        ...filters.value,
      })

      // Ignore results from an outdated filter request.
      if (currentRequest !== requestId) return

      const rows = result.rows.map(spell => ({
        ...spell,
        n: spell.name,
        s: spell.school,
        d: spell.descr,
      }))

      imported.value = reset
        ? rows
        : imported.value.concat(rows)

      total.value = result.total
      hasMore.value = result.hasMore
    } catch (e) {
      if (currentRequest === requestId) {
        error.value = e?.msg || 'No se pudo cargar el catálogo'
        console.error('Error loading spell catalog:', e)
      }
    } finally {
      if (currentRequest === requestId) {
        loading.value = false
        loadingMore.value = false
      }
    }
  }

  function setFilters(nextFilters) {
    filters.value = {
      ...filters.value,
      ...nextFilters,
    }

    return load(true)
  }

  function loadMore() {
    return load(false)
  }

  const find = name =>
    index.value[String(name || '').toLowerCase()] || null

  function suggest(query) {
    const q = String(query || '').trim().toLowerCase()
    if (q.length < 2) return []

    const result = []

    for (const spell of all.value) {
      if (String(spell.n || '').toLowerCase().includes(q)) {
        result.push(spell)
        if (result.length >= 10) break
      }
    }

    return result
  }

async function loadForCast({
  classAliases = [],
  level = '',
  query = '',
  domains = [],
} = {}) {
  const normalResult = await fetchSpellCatalogPage({
    offset: 0,
    limit: 100,
    classAliases,
    level,
    query,
  })

  const domainNames = domains
    .map(domain => typeof domain === 'string' ? domain : domain.name)
    .filter(Boolean)

  if (!domainNames.length || level === '') {
    return {
      ...normalResult,
      rows: normalResult.rows.map(spell => ({
        ...spell,
        n: spell.name,
        s: spell.school,
        d: spell.descr,
        dom: false,
      })),
    }
  }

  const domainResult = await fetchSpellCatalogPage({
    offset: 0,
    limit: 100,
    level,
    domains: domainNames,
  })

  const normalRows = normalResult.rows.map(spell => ({
    ...spell,
    n: spell.name,
    s: spell.school,
    d: spell.descr,
    dom: false,
  }))

  const domainRows = domainResult.rows.map(spell => ({
    ...spell,
    n: spell.name,
    s: spell.school,
    d: spell.descr,
    dom: true,
  }))

  return {
    rows: [...normalRows, ...domainRows],
    total: normalResult.total + domainResult.total,
    hasMore: normalResult.hasMore || domainResult.hasMore,
  }
}

  return {
    imported,
    all,
    loading,
    loadingMore,
    error,
    total,
    hasMore,
    ratings,
    filters,
    load,
    loadMore,
    loadRatings,
    setFilters,
    find,
    suggest,
    loadForCast
  }
})
