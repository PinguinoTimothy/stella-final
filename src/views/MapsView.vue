<script setup>
// Adventure library (DM only). Import the maps PDFs and the adventure book PDF once; they stay on this device.
// Maps with an index open by map and room. A book adds the encounter of each room to the maps it belongs to.
import { computed, onMounted, ref } from 'vue'
import MapViewer from '../components/Maps/MapViewer.vue'
import { allRooms, knownSectionsFor } from '../lib/mapIndexes'
import { openPdf } from '../lib/pdfRender'
import { readBook, parseRooms } from '../lib/bookIndex'
import { addMap, listMaps, removeMap, renameMap, setPages, setSections, updateMap } from '../lib/mapsDb'

const maps = ref([])
const opened = ref(null)     // { map, title, page, rooms, encounters }
const busy = ref('')
const error = ref('')
const usage = ref(null)

const totalMb = computed(() => {
  const bytes = maps.value.reduce((acc, m) => acc + (m.size || 0), 0)
  return (bytes / (1024 * 1024)).toFixed(1)
})
const mapsOnly = computed(() => maps.value.filter((m) => !m.encounters))
const books = computed(() => maps.value.filter((m) => m.encounters))

async function refresh() {
  maps.value = await listMaps()
  try {
    const est = await navigator.storage?.estimate?.()
    usage.value = est ? { used: est.usage, quota: est.quota } : null
  } catch {
    usage.value = null
  }
}

/** The encounters of the book that shares the most room codes with this map. {} if none does. */
function encountersFor(m) {
  const codes = new Set(allRooms(m.sections || []).map((r) => r.code))
  let best = null
  let score = 0
  for (const b of books.value) {
    const s = Object.keys(b.encounters).filter((c) => codes.has(c)).length
    if (s > score) { best = b; score = s }
  }
  return best ? best.encounters : {}
}

async function importFiles(event) {
  const files = [...(event.target.files || [])].filter((f) => /pdf$/i.test(f.name) || f.type === 'application/pdf')
  event.target.value = ''
  if (!files.length) return
  error.value = ''
  for (const file of files) {
    busy.value = `Importing ${file.name}…`
    try {
      const meta = await addMap(file)
      const doc = await openPdf(file)
      await setPages(meta.id, doc.numPages)
      const sections = knownSectionsFor(meta.name, doc.numPages)
      if (sections) {
        await setSections(meta.id, sections)
      } else {
        // Not a known map: read it as a book. A book has rooms with encounters; a map PDF has none.
        busy.value = `Reading ${file.name}…`
        const { rooms, warnings } = parseRooms(await readBook(doc))
        if (rooms.length) {
          const encounters = Object.fromEntries(rooms.map((r) => [r.code, r]))
          await updateMap(meta.id, { encounters })
          if (warnings.length) error.value = `${rooms.length} rooms read from ${file.name}. ${warnings.length} notes to check.`
        }
      }
      doc.destroy()
    } catch {
      error.value = `Could not import ${file.name}.`
    }
  }
  busy.value = ''
  await refresh()
}

/** For maps imported before the index existed: attach it now if there is one for this PDF. */
async function attachIndex(map) {
  const sections = knownSectionsFor(map.name, map.pages)
  if (sections) await setSections(map.id, sections)
  else error.value = `No index is available for "${map.name}".`
  await refresh()
}

function openMap(map, section) {
  const encounters = encountersFor(map)
  if (section) {
    opened.value = {
      map,
      title: section.title,
      page: section.page,
      rooms: section.rooms.map((r) => ({ ...r, page: section.page })),
      encounters,
    }
  } else {
    opened.value = { map, title: '', page: 1, rooms: allRooms(map.sections || []), encounters }
  }
}

async function rename(map) {
  const name = window.prompt('Name for this map', map.name)
  if (name && name.trim() && name.trim() !== map.name) {
    await renameMap(map.id, name.trim())
    await refresh()
  }
}

async function remove(map) {
  if (!window.confirm(`Delete "${map.name}" from this device?`)) return
  await removeMap(map.id)
  await refresh()
}

function fmtMb(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

onMounted(refresh)
</script>

<template>
  <main class="page maps-page">
    <header class="maps-head">
      <h2 class="pg">Adventure</h2>
      <label class="btn-like">
        Import PDF
        <input type="file" accept="application/pdf,.pdf" multiple hidden @change="importFiles">
      </label>
    </header>

    <p class="isum">
      <span><b>{{ mapsOnly.length }}</b> {{ mapsOnly.length === 1 ? 'map PDF' : 'map PDFs' }}</span>
      <span><b>{{ books.length }}</b> {{ books.length === 1 ? 'book' : 'books' }}</span>
      <span><b>{{ totalMb }}</b> MB stored</span>
      <span v-if="usage">of {{ fmtMb(usage.quota) }} available on this device</span>
    </p>

    <p v-if="busy" class="mute" role="status">{{ busy }}</p>
    <p v-if="error" class="warn" role="alert">{{ error }}</p>

    <section v-if="!maps.length && !busy" class="panel item-empty">
      <p>No PDFs yet.</p>
      <p class="mute">Import the maps and the adventure book. They stay on this device and work offline.</p>
    </section>

    <ul v-else class="maps-list">
      <li v-for="m in maps" :key="m.id" class="maps-row">
        <div class="maps-top">
          <button v-if="!m.encounters" type="button" class="maps-open" @click="openMap(m, null)">
            <span class="maps-name">{{ m.name }}</span>
            <span class="mute">{{ m.pages ? m.pages + ' pages' : 'PDF' }} · {{ fmtMb(m.size) }}</span>
          </button>
          <div v-else class="maps-open">
            <span class="maps-name">{{ m.name }}</span>
            <span class="mute">Book · {{ Object.keys(m.encounters).length }} rooms · {{ fmtMb(m.size) }}</span>
          </div>
          <button v-if="!m.encounters && !m.sections && m.pages" type="button" class="maps-act" @click="attachIndex(m)">Index</button>
          <button type="button" class="maps-act" aria-label="Rename" @click="rename(m)">Rename</button>
          <button type="button" class="maps-act maps-del" aria-label="Delete" @click="remove(m)">Delete</button>
        </div>

        <ul v-if="m.sections?.length" class="maps-sections">
          <li v-for="(s, i) in m.sections" :key="i">
            <button type="button" class="maps-section" @click="openMap(m, s)">
              <span>{{ s.title }}</span>
              <span class="mute">{{ s.rooms.length }} rooms</span>
            </button>
          </li>
        </ul>
      </li>
    </ul>

    <MapViewer
      v-if="opened && opened.rooms.length"
      :map="opened.map"
      :title="opened.title"
      :page="opened.page"
      :rooms="opened.rooms"
      :encounters="opened.encounters"
      @close="opened = null"
    />
  </main>
</template>

<style scoped>
.maps-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.btn-like {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid var(--acc);
  color: var(--acc);
  cursor: pointer;
}
.maps-list { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 8px; }
.maps-row {
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
}
.maps-top {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: center;
  gap: 8px;
}
.maps-open {
  display: grid;
  gap: 2px;
  min-width: 0;
  padding: 4px 0;
  background: none;
  border: 0;
  border-radius: 0;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.maps-name { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.maps-act { min-height: 36px; padding: 0 10px; border-radius: 10px; font-size: 13px; }
.maps-del { color: var(--warn); }

.maps-sections {
  list-style: none;
  margin: 10px 0 0;
  padding: 0 0 0 10px;
  display: grid;
  gap: 4px;
  border-left: 2px solid var(--acc);
}
.maps-section {
  width: 100%;
  min-height: 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  background: none;
  border: 0;
  border-radius: 8px;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.maps-section:hover, .maps-section:focus-visible { background: var(--raise); outline: none; }
.maps-section span:first-child { font-weight: 600; }
</style>
