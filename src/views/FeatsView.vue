<script setup>
// More › Feats: searchable list. Opening a feat shows its details and a graph of what it requires and unlocks.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import FeatGraph from '../components/Feats/FeatGraph.vue';
import { featGraph, fetchFeatFacets, fetchFeatPage } from '../lib/feats';

const LIMIT = 40;
const query = ref('');
const category = ref('');
const source = ref('');
const facets = ref({ categories: [], sources: [] });
const rows = ref([]);
const total = ref(0);
const loading = ref(false);
const error = ref('');
const hasMore = computed(() => rows.value.length < total.value);

const graph = ref(null);
const depth = ref(1);
const graphLoading = ref(false);
const graphError = ref('');

let listReq = 0;
let graphReq = 0;
let debounce = null;

async function load(reset = true) {
  const id = ++listReq;
  loading.value = true;
  error.value = '';
  try {
    const page = await fetchFeatPage({
      query: query.value,
      category: category.value,
      source: source.value,
      offset: reset ? 0 : rows.value.length,
      limit: LIMIT,
    });
    if (id !== listReq) return;
    rows.value = reset ? page.rows : rows.value.concat(page.rows);
    total.value = page.total;
  } catch {
    if (id === listReq) error.value = 'Could not load the feats. Check your connection.';
  } finally {
    if (id === listReq) loading.value = false;
  }
}

watch(query, () => {
  clearTimeout(debounce);
  debounce = setTimeout(() => load(true), 300);
});
watch([category, source], () => load(true));

async function open(id) {
  const req = ++graphReq;
  graphLoading.value = true;
  graphError.value = '';
  try {
    const g = await featGraph(id, depth.value);
    if (req !== graphReq) return;
    if (g) graph.value = g;
    else graphError.value = 'This feat is not in the database.';
  } catch {
    if (req === graphReq) graphError.value = 'Could not load this feat.';
  } finally {
    if (req === graphReq) graphLoading.value = false;
  }
}

function close() {
  graphReq++;
  graph.value = null;
  graphError.value = '';
  graphLoading.value = false;
}

function toggleDepth() {
  depth.value = depth.value === 1 ? 2 : 1;
  if (graph.value) open(graph.value.center.id);
}

// Feats the open one needs, and feats that need it, from the graph's nodes.
const requires = computed(() => {
  const g = graph.value;
  if (!g) return [];
  const ids = new Set(g.center.prereq_feats || []);
  return g.nodes.filter(n => ids.has(n.id));
});
const unlocks = computed(() => {
  const g = graph.value;
  if (!g) return [];
  return g.nodes.filter(n => (n.prereq_feats || []).includes(g.center.id));
});

const unlocksOpen = ref(false);

onMounted(async () => {
  load(true);
  try {
    facets.value = await fetchFeatFacets();
  } catch {
    // The filters stay empty; the list still works.
  }
});
onBeforeUnmount(() => clearTimeout(debounce));
</script>

<template>
  <template v-if="!graph && !graphLoading && !graphError">
    <h2 class="pg">Feats</h2>
    <p class="mute">{{ total }} feats. Tap one to see what it requires and what it unlocks.</p>

    <div class="grid">
      <input v-model="query" class="sr" type="search" placeholder="Search feats by name…" aria-label="Search feats" />
      <div class="grid g2">
        <select v-model="category" aria-label="Category">
          <option value="">All categories</option>
          <option v-for="c in facets.categories" :key="c" :value="c">
            {{ c }}
          </option>
        </select>
        <select v-model="source" aria-label="Source">
          <option value="">All sources</option>
          <option v-for="s in facets.sources" :key="s" :value="s">
            {{ s }}
          </option>
        </select>
      </div>
    </div>

    <p v-if="error" class="mute" role="alert">
      {{ error }}
    </p>
    <section v-else-if="!loading && !rows.length" class="panel item-empty">No feat matches.</section>

    <div class="grid" style="margin-top: 12px">
      <button v-for="f in rows" :key="f.id" class="more-row" @click="open(f.id)">
        <span>
          <b>{{ f.name }}</b>
          <small>
            {{ (f.categories || []).join(' · ') }}<template v-if="f.source"> · {{ f.source }}</template>
          </small>
        </span>
        <i aria-hidden="true">›</i>
      </button>
    </div>

    <button v-if="hasMore" type="button" :disabled="loading" style="margin-top: 12px" @click="load(false)">
      {{ loading ? 'Loading…' : 'Load more' }}
    </button>
  </template>

  <template v-else>
    <button class="back" @click="close">‹ Feats</button>

    <p v-if="graphLoading" class="mute">Loading…</p>
    <p v-else-if="graphError" class="mute" role="alert">
      {{ graphError }}
    </p>

    <template v-else-if="graph">
      <h2>{{ graph.center.name }}</h2>
      <p class="mute">
        {{ (graph.center.categories || []).join(' · ')
        }}<template v-if="graph.center.source"> · {{ graph.center.source }} </template>
      </p>
      <p v-if="graph.center.prerequisites"><b>Prerequisites</b> {{ graph.center.prerequisites }}</p>

      <div class="fv-bar">
        <span class="mute">{{ depth === 1 ? 'Showing 1 level' : 'Showing 2 levels' }}</span>
        <button type="button" @click="toggleDepth">
          {{ depth === 1 ? 'Show 2 levels' : 'Show 1 level' }}
        </button>
      </div>
      <FeatGraph :graph="graph" @select="open" />
      <p v-if="graph.truncated" class="mute">Some unlocks are not shown (the graph keeps the first 25 per level).</p>

      <section v-if="requires.length" class="fv-sec">
        <h3>Requires</h3>
        <div class="fv-chips">
          <button v-for="n in requires" :key="n.id" class="chip" @click="open(n.id)">
            {{ n.name }}
          </button>
        </div>
      </section>

      <details
        v-if="unlocks.length"
        class="fv-sec fv-collapsible"
        :open="unlocksOpen"
        @toggle="unlocksOpen = $event.target.open"
      >
        <summary>Unlocks ({{ unlocks.length }})</summary>
        <div class="fv-chips">
          <button v-for="n in unlocks" :key="n.id" class="chip" @click="open(n.id)">
            {{ n.name }}
          </button>
        </div>
      </details>

      <section v-if="graph.center.benefit" class="fv-sec">
        <h3>Benefit</h3>
        <p>{{ graph.center.benefit }}</p>
      </section>
      <section v-if="graph.center.normal" class="fv-sec">
        <h3>Normal</h3>
        <p>{{ graph.center.normal }}</p>
      </section>
      <section v-if="graph.center.special" class="fv-sec">
        <h3>Special</h3>
        <p>{{ graph.center.special }}</p>
      </section>
      <section v-if="graph.center.description" class="fv-sec">
        <h3>Description</h3>
        <p>{{ graph.center.description }}</p>
      </section>
    </template>
  </template>
</template>

<style scoped>
.fv-sec {
  margin-top: 14px;
}

.fv-sec h3 {
  margin: 0 0 6px;
}

.fv-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.fv-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 8px 0;
}
.fv-collapsible > summary {
  cursor: pointer;
  font-weight: 700;
  margin-bottom: 6px;
}
</style>
