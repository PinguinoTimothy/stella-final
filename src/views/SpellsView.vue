
<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useAppStore } from '../stores/app'
import { useSpells } from '../stores/spells'

const app = useAppStore()
const store = useSpells()

const query = ref('')
const school = ref('')
const classId = ref('')
const level = ref('')
const rating = ref('')
const expanded = ref('')

let observer

const norm = value => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()

const schoolOf = spell =>
  String(spell.s || spell.school || '').split('[')[0].trim()

const classes = computed(() => (app.S.cl || []).map((c, i) => ({
  id: String(i),
  name: c.name || c.abbr || `Clase ${i + 1}`,
aliases: String(c.abbr || '')
  .split(/\s+/)
  .map(norm)
  .filter(Boolean),
})))

const schools = computed(() => [
  ...new Set(store.imported.map(schoolOf).filter(Boolean))
].sort())

const results = computed(() => store.imported)

const count = computed(() =>
  `${store.imported.length} de ${store.total} conjuros`
)

const display = value =>
  value === undefined || value === null || value === '' ? '—' : value

function toggle(spell) {
  const key = norm(spell.n)
  expanded.value = expanded.value === key ? '' : key
}

function clearFilters() {
  query.value = ''
  school.value = ''
  classId.value = ''
  level.value = ''
  rating.value = ''
}

let filterTimer

function applyFilters() {
  clearTimeout(filterTimer)

  filterTimer = setTimeout(() => {
    const selected = classes.value.find(c => c.id === classId.value)

    store.setFilters({
      query: query.value,
      school: school.value,
      classAliases: selected?.aliases || [],
      level: level.value,
      rating: rating.value,
    })

    expanded.value = ''
  }, 250)
}

watch([query, school, classId, level, rating], applyFilters)

const sentinel = ref(null)

function observeSentinel() {
  if (observer) observer.disconnect()

  if (!sentinel.value) return

  observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      store.loadMore()
    }
  }, {
    rootMargin: '300px',
  })

  observer.observe(sentinel.value)
}

watch(sentinel, observeSentinel)

onMounted(async () => {
  await Promise.all([
    store.load(true),
    store.loadRatings(),
  ])

  observeSentinel()
})

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
  clearTimeout(filterTimer)
})
</script>

<template>
  <main class="spells-view">
    <header class="spells-heading">
      <div>
        <h1>Spells</h1>
        <p class="mute">Catálogo de conjuros · Pathfinder 1.ª edición</p>
      </div>
      <span class="spells-count">{{ count }}</span>
    </header>

    <section class="panel spells-filters">
      <label class="spells-search">
        Buscar
        <input
          v-model="query"
          type="search"
          placeholder="Nombre, efecto o descripción…"
          autocomplete="off"
        >
      </label>

      <div class="spells-filter-grid">
        <label>
          Escuela
          <select v-model="school">
            <option value="">Todas</option>
            <option v-for="s in schools" :key="s" :value="s">
              {{ s }}
            </option>
          </select>
        </label>

        <label>
          Clase
          <select v-model="classId">
            <option value="">Todas</option>
            <option
              v-for="c in classes"
              :key="c.id"
              :value="c.id"
            >
              {{ c.name }}
            </option>
          </select>
        </label>

        <label>
          Nivel
          <select v-model="level">
            <option value="">Todos</option>
            <option
              v-for="n in 10"
              :key="n - 1"
              :value="String(n - 1)"
            >
              {{ n - 1 }}
            </option>
          </select>
        </label>

        <label>
          Rating
          <select v-model="rating">
            <option value="">Todos</option>
            <option
              v-for="r in store.ratings"
              :key="r"
              :value="r"
            >
              {{ r }}
            </option>
          </select>
        </label>
      </div>

      <button
        v-if="query || school || classId !== '' || level !== '' || rating !== ''"
        class="spells-clear"
        type="button"
        @click="clearFilters"
      >
        Limpiar filtros
      </button>
    </section>

    <section v-if="store.loading && !results.length" class="panel mute">
      Cargando catálogo…
    </section>

    <section v-else-if="store.error" class="panel spells-empty">
      <h2>No se pudo cargar el catálogo</h2>
      <p class="mute">{{ store.error }}</p>
      <button type="button" @click="store.load(true)">
        Reintentar
      </button>
    </section>

    <section v-else-if="!results.length" class="panel spells-empty">
      <h2>No hay resultados</h2>
      <p class="mute">
        Prueba con otro término o elimina alguno de los filtros.
      </p>
      <button type="button" @click="clearFilters">
        Limpiar búsqueda y filtros
      </button>
    </section>

    <section v-else class="spells-results">
      <article
        v-for="spell in results"
        :key="spell.id || spell.n"
        class="panel spells-card"
      >
        <button
          class="spells-card-head"
          type="button"
          :aria-expanded="expanded === norm(spell.n)"
          @click="toggle(spell)"
        >
          <span class="spells-card-title">
            <b>{{ spell.n }}</b>
            <small>{{ schoolOf(spell) || 'Escuela no especificada' }}</small>
          </span>

          <span class="spells-card-meta">
            <small>{{ spell.lv || 'Nivel —' }}</small>
            <span aria-hidden="true">
              {{ expanded === norm(spell.n) ? '−' : '+' }}
            </span>
          </span>
        </button>

        <div
          v-if="expanded === norm(spell.n)"
          class="spells-detail"
        >
          <div class="spells-facts">
            <div><small>Lanzamiento</small><b>{{ display(spell.ct) }}</b></div>
            <div><small>Alcance</small><b>{{ display(spell.rng) }}</b></div>
            <div><small>Duración</small><b>{{ display(spell.dur) }}</b></div>
            <div><small>Objetivo</small><b>{{ display(spell.tg) }}</b></div>
            <div><small>Área</small><b>{{ display(spell.area) }}</b></div>
            <div><small>Efecto</small><b>{{ display(spell.eff) }}</b></div>
            <div><small>Salvación</small><b>{{ display(spell.sv) }}</b></div>
            <div><small>Resistencia a conjuros</small><b>{{ display(spell.sr) }}</b></div>
            <div><small>Componentes</small><b>{{ display(spell.comp) }}</b></div>
            <div><small>Coste</small><b>{{ display(spell.cost) }}</b></div>
            <div><small>Rating</small><b>{{ display(spell.rt) }}</b></div>
          </div>

          <p v-if="spell.d" class="spells-description">
            {{ spell.d }}
          </p>

          <p v-if="spell.src" class="mute spells-source">
            Fuente: {{ spell.src }}
          </p>
        </div>
      </article>

      <div ref="sentinel" class="spells-sentinel">
        <span v-if="store.loadingMore" class="mute">
          Cargando más conjuros…
        </span>
        <span v-else-if="store.hasMore" class="mute">
          Desplázate para cargar más
        </span>
        <span v-else class="mute">
          Has llegado al final del catálogo
        </span>
      </div>
    </section>
  </main>
</template>

<style scoped>
.spells-view{max-width:600px;margin:0 auto;padding:16px 14px 100px}
.spells-heading{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:14px}
.spells-heading h1{margin-bottom:4px}.spells-heading p{margin:0}
.spells-count{color:var(--mute);font-size:13px;white-space:nowrap;padding-bottom:5px}
.spells-filters{display:grid;gap:12px;margin-bottom:14px}
.spells-filters label{display:grid;gap:5px;min-width:0;color:var(--mute);font-size:14px}
.spells-filters input,.spells-filters select{width:100%;color:var(--ink)}
.spells-filter-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.spells-clear{justify-self:start;min-height:36px;padding:4px 12px}
.spells-results{display:grid;gap:8px}
.spells-card{padding:0;overflow:hidden}
.spells-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:68px;padding:12px 14px;border:0;border-radius:0;background:transparent;text-align:left}
.spells-card-title{display:grid;gap:2px;min-width:0}
.spells-card-title b{font-size:17px}
.spells-card-title small,.spells-card-meta small{color:var(--mute);font-size:13px}
.spells-card-meta{display:flex;align-items:center;gap:12px;text-align:right}
.spells-card-meta span{font-size:23px;color:var(--acc);width:18px}
.spells-detail{border-top:1px solid var(--line);padding:12px 14px 14px}
.spells-facts{display:grid;grid-template-columns:1fr 1fr;gap:10px 14px}
.spells-facts div{display:grid;gap:2px;min-width:0}
.spells-facts small{color:var(--mute);font-size:12px}
.spells-facts b{font-size:14px;font-weight:500;overflow-wrap:anywhere}
.spells-description{white-space:pre-line;margin:14px 0 0}
.spells-source{font-size:13px}
.spells-empty{display:grid;gap:8px}
.spells-empty p{margin:0}
.spells-sentinel{text-align:center;padding:20px 8px;min-height:45px}
@media(max-width:390px){.spells-filter-grid{grid-template-columns:1fr 1fr}}
</style>
