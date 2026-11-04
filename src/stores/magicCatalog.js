// Magic catalog screen: the filters, the items loaded so far, and how they are fetched.
// Items arrive a page at a time as the list is scrolled. Filters run on the server; sorting by price uses a light id+price index.
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { fetchMagicByIds, fetchMagicFacets, fetchMagicPage, fetchMagicPriceIndex } from '../lib/supabase';
import { getMagicFacetsCache, setMagicFacetsCache } from '../lib/catalogCache';
import { normalizeItem, PAGE_SIZE, sortByPrice } from '../lib/magic';

const DEBOUNCE = 300;
const MAX_CACHED = 40; // pages kept in memory so going back and forth is instant
const MAX_PRICE_INDEXES = 8; // filters whose id+price list is kept; each is a few KB

export const useMagicCatalog = defineStore('magicCatalog', () => {
  const search = ref('');
  const group = ref('');
  const slot = ref('');
  const sort = ref('default');

  const rows = ref([]); // every item loaded so far, in order
  const page = ref(-1); // index of the last page loaded; -1 = none yet
  const total = ref(0);
  const loading = ref(false);
  const appending = ref(false); // true while the next page is being added to the end of the list
  const error = ref('');
  const facets = ref({ groups: [], slots: [] });

  const hasMore = computed(() => rows.value.length < total.value);

  let controller = null,
    request = 0,
    timer = 0,
    started = false,
    appendFailed = false;
  const pages = new Map(); // filter+sort+page → { rows, total }
  const priceIndexes = new Map(); // filter → { raw: [{ id, price }], sorted: { asc, desc } }; bounded below

  const filterKey = () => JSON.stringify([search.value.trim().toLowerCase(), group.value, slot.value]);
  const filters = () => ({ query: search.value, group: group.value, slot: slot.value });

  function remember(key, value) {
    pages.set(key, value);
    if (pages.size > MAX_CACHED) pages.delete(pages.keys().next().value);
  }

  /**
   * Ids of everything that matches, sorted by price. The download happens once per filter, not per sort
   * order: switching between low→high and high→low only re-sorts the list already in memory.
   */
  async function sortedIndex(signal) {
    const key = filterKey();
    let entry = priceIndexes.get(key);
    if (!entry) {
      entry = { raw: await fetchMagicPriceIndex({ ...filters(), signal }), sorted: {} };
      priceIndexes.set(key, entry);
      if (priceIndexes.size > MAX_PRICE_INDEXES) priceIndexes.delete(priceIndexes.keys().next().value);
    }
    if (!entry.sorted[sort.value]) entry.sorted[sort.value] = sortByPrice(entry.raw, sort.value);
    return entry.sorted[sort.value];
  }

  async function fetchPage(n, signal) {
    if (sort.value === 'default') {
      const r = await fetchMagicPage({
        ...filters(),
        offset: n * PAGE_SIZE,
        limit: PAGE_SIZE,
        signal,
      });
      return { rows: r.rows.map(normalizeItem), total: r.total };
    }
    const index = await sortedIndex(signal);
    const ids = index.slice(n * PAGE_SIZE, (n + 1) * PAGE_SIZE).map(x => x.id);
    const byId = new Map((await fetchMagicByIds(ids, signal)).map(r => [r.id, r]));
    return {
      rows: ids
        .map(id => byId.get(id))
        .filter(Boolean)
        .map(normalizeItem),
      total: index.length,
    };
  }

  /**
   * Loads a page for the current filters. Without `append` the list starts again from the first page;
   * with it, the next page is added to the end. A newer call cancels the one still running.
   */
  async function load({ append = false } = {}) {
    if (append && (loading.value || !hasMore.value)) return;
    const target = append ? page.value + 1 : 0;
    const mine = ++request;
    controller?.abort();
    controller = new AbortController();
    const key = `${filterKey()}|${sort.value}|${target}`;

    const show = result => {
      rows.value = append ? [...rows.value, ...result.rows] : result.rows;
      total.value = result.total;
      page.value = target;
    };

    if (pages.has(key)) {
      show(pages.get(key));
      error.value = '';
      loading.value = false;
      appending.value = false;
      return;
    }

    loading.value = true;
    appending.value = append;
    error.value = '';
    try {
      const result = await fetchPage(target, controller.signal);
      if (mine !== request) return;
      remember(key, result);
      show(result);
      appendFailed = false;
    } catch (e) {
      if (mine !== request || e?.name === 'AbortError') return;
      appendFailed = append;
      error.value = append
        ? 'Could not load more items. Check your connection.'
        : rows.value.length
          ? 'Could not refresh the catalog. Showing the previous results.'
          : 'Could not load the magic catalog. Check your connection.';
    } finally {
      if (mine === request) {
        loading.value = false;
        appending.value = false;
      }
    }
  }

  /** The Group and Slot lists: the saved copy first, then fresh from the cloud. */
  async function loadFacets() {
    try {
      const saved = await getMagicFacetsCache();
      if (saved?.groups) facets.value = saved;
    } catch {
      /* optional */
    }
    try {
      facets.value = await fetchMagicFacets();
      setMagicFacetsCache(facets.value).catch(() => {});
    } catch {
      /* keeps the saved lists */
    }
  }

  function start() {
    if (started) {
      load();
      return;
    }
    started = true;
    load();
    loadFacets();
    // A new filter starts the list again; typing waits for a pause so it doesn't send a request per key.
    watch([search, group, slot, sort], () => {
      clearTimeout(timer);
      timer = setTimeout(() => load(), DEBOUNCE);
    });
  }

  function changeGroup(value) {
    group.value = value;
    slot.value = '';
  }

  function loadMore() {
    return load({ append: true });
  }

  function retry() {
    pages.clear();
    priceIndexes.clear();
    load({ append: appendFailed });
  }

  return {
    search,
    group,
    slot,
    sort,
    rows,
    total,
    hasMore,
    loading,
    appending,
    error,
    facets,
    start,
    changeGroup,
    loadMore,
    retry,
  };
});
