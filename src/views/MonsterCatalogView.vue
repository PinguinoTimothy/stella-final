<script setup>
// More › Monsters: the bestiary. Tap a monster to read its stat block; the + button adds it to combat.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BackButton from '../components/BackButton.vue'
import Sheet from '../components/Sheet.vue'
import CombatCard from '../components/Monsters/CombatCard.vue'
import { useAppStore } from '../stores/app'
import { useMonsterFights } from '../stores/monsterFights'
import {
  CR_OPTIONS,
  combatSummary,
  crLabel,
  fetchMonsterDetail,
  fetchMonsterPage,
  fetchMonsterTypes,
} from '../lib/monsters'

const app = useAppStore()
const fights = useMonsterFights()

/* ---------- bestiary list ---------- */

const query = ref('')
const type = ref('')
const cr = ref('')
const types = ref([])
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const error = ref('')
const hasMore = computed(() => rows.value.length < total.value)

let reqId = 0
let debounce = null

async function load(reset = true) {
  const id = ++reqId
  loading.value = true
  error.value = ''
  try {
    const page = await fetchMonsterPage({
      query: query.value,
      type: type.value,
      cr: cr.value,
      offset: reset ? 0 : rows.value.length,
    })
    if (id !== reqId) return
    rows.value = reset ? page.rows : rows.value.concat(page.rows)
    total.value = page.total
  } catch {
    if (id === reqId) error.value = 'Could not load the monsters. Check your connection.'
  } finally {
    if (id === reqId) loading.value = false
  }
}

watch(query, () => {
  clearTimeout(debounce)
  debounce = setTimeout(() => load(true), 300)
})
watch([type, cr], () => load(true))

onMounted(async () => {
  load(true)
  try {
    types.value = await fetchMonsterTypes()
  } catch {
    // The type filter stays empty; the list still works.
  }
})
onBeforeUnmount(() => clearTimeout(debounce))

/* ---------- stat block (read only) ---------- */

const stats = ref(null)   // { monster, card, error, loading } while the sheet is open
let statsReq = 0

async function openStats(m) {
  const id = ++statsReq
  stats.value = { monster: m, card: null, error: '', loading: true }
  try {
    const data = await fetchMonsterDetail(m.url)
    if (id !== statsReq || !stats.value) return
    if (data) stats.value.card = combatSummary(data)
    else stats.value.error = 'This monster is not in the database.'
  } catch {
    if (id === statsReq && stats.value) stats.value.error = 'Could not load this monster.'
  } finally {
    if (id === statsReq && stats.value) stats.value.loading = false
  }
}

function closeStats() {
  statsReq++
  stats.value = null
}

/* ---------- combat ---------- */

function addFight(m) {
  fights.add(m.url, m.name)
  app.notify(`${m.name} added to combat`)
}

function addFromStats() {
  if (!stats.value) return
  addFight(stats.value.monster)
  closeStats()
}
</script>

<template>
  <BackButton />
  <h2 class="pg">Monsters</h2>
  <p class="mute">{{ total }} creatures in the bestiary. Tap a name to read it; + adds it to combat.</p>

  <div class="grid">
    <input v-model="query" class="sr" type="search" placeholder="Search monsters…" aria-label="Search monsters">
    <div class="grid g2">
      <select v-model="type" aria-label="Type">
        <option value="">All types</option>
        <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
      </select>
      <select v-model="cr" aria-label="Challenge rating">
        <option value="">Any CR</option>
        <option v-for="c in CR_OPTIONS" :key="c" :value="String(c)">CR {{ crLabel(c) }}</option>
      </select>
    </div>
  </div>

  <p v-if="error" class="mute" role="alert">{{ error }}</p>
  <section v-else-if="!loading && !rows.length" class="panel item-empty">No monster matches.</section>

  <div class="grid" style="margin-top:12px">
    <div v-for="m in rows" :key="m.url" class="cat-row">
      <button class="more-row cat-main" @click="openStats(m)">
        <span>
          <b>{{ m.name }}</b>
          <small>CR {{ crLabel(m.cr) }} · {{ m.size }} {{ m.type }} · HP {{ m.hp }} · AC {{ m.ac }}</small>
        </span>
        <i aria-hidden="true">›</i>
      </button>
      <button class="cast cat-add" aria-label="Add to combat" title="Add to combat" @click="addFight(m)">+</button>
    </div>
  </div>

  <button v-if="hasMore" type="button" :disabled="loading" style="margin-top:12px" @click="load(false)">
    {{ loading ? 'Loading…' : 'Load more' }}
  </button>

  <Sheet v-if="stats" :title="stats.monster.name" @close="closeStats">
    <p v-if="stats.loading" class="mute">Loading…</p>
    <p v-else-if="stats.error" class="mute" role="alert">{{ stats.error }}</p>
    <template v-else-if="stats.card">
      <CombatCard :card="stats.card" />
      <button class="cast" style="width:100%;margin-top:12px" @click="addFromStats">Add to combat</button>
    </template>
  </Sheet>
</template>

<style scoped>
.cat-row {
  display: flex;
  gap: 8px;
  align-items: stretch;
}

.cat-main {
  flex: 1;
  min-width: 0;
}

.cat-add {
  flex: none;
  width: 52px;
  min-height: 52px;
  padding: 0;
  font-size: 22px;
}
</style>