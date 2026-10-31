<script setup>
// More › Monsters: the bestiary. Tap a name to read it in a centred panel; + adds it to combat.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BackButton from '../components/BackButton.vue'
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
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  clearTimeout(debounce)
  window.removeEventListener('keydown', onKey)
})

/* ---------- stat panel (centred, read only) ---------- */

const stats = ref(null)   // { monster, card, error, loading } while the panel is open
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

function onKey(e) {
  if (e.key === 'Escape' && stats.value) closeStats()
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

  <!-- Centred panel with the stat block. Escape, × or a tap outside closes it. -->
  <div v-if="stats" class="mc-bg" @click.self="closeStats">
    <section class="mc-modal" role="dialog" aria-modal="true" :aria-label="stats.monster.name">
      <header class="mc-head">
        <h2>{{ stats.monster.name }}</h2>
        <button class="x" aria-label="Close" @click="closeStats">×</button>
      </header>

      <div class="mc-body">
        <p v-if="stats.loading" class="mute">Loading…</p>
        <p v-else-if="stats.error" class="mute" role="alert">{{ stats.error }}</p>
        <CombatCard v-else-if="stats.card" :card="stats.card" />
      </div>

      <footer v-if="stats.card" class="mc-foot">
        <button class="cast" style="width:100%" @click="addFromStats">Add to combat</button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.cat-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.cat-main {
  flex: 1;
  min-width: 0;
}

.cat-add {
  flex: none;
  width: 36px;
  min-width: 36px;
  min-height: 36px;
  padding: 0;
  font-size: 18px;
  line-height: 1;
}

.mc-bg {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, .55);
}

.mc-modal {
  width: min(560px, 100%);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  background: var(--surface, #11222d);
  border: 1px solid var(--line, #264452);
  border-radius: 18px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, .5);
}

.mc-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--line, #264452);
}

.mc-head h2 {
  flex: 1;
  margin: 0;
  font-size: 22px;
}

.mc-head .x {
  min-width: 36px;
  min-height: 36px;
}

.mc-body {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 12px 16px 16px;
}

.mc-foot {
  padding: 10px 14px;
  border-top: 1px solid var(--line, #264452);
}
</style>