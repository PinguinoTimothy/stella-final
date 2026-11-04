<script setup>
// Adventures (DM only). Import the book and the maps of an adventure; files with the same name are one
// adventure, and the map opens inside the adventure, so the list only has adventures.
import { computed, onMounted, ref } from 'vue'
import MapViewer from '../components/Maps/MapViewer.vue'
import { openPdf } from '../lib/pdfRender'
import { readBook, parseRooms } from '../lib/bookIndex'
import { addMap, listMaps, removeMap, renameMap, updateMap } from '../lib/mapsDb'
import { adventureKey, adventureName } from '../lib/adventures'

const parts = ref([])        // every stored PDF
const opened = ref(null)     // { title, book, map }
const busy = ref('')
const error = ref('')

/** One entry per adventure: its book and its map, the newest of each if there are several. */
const adventures = computed(() => {
  const groups = new Map()
  for (const m of parts.value) {
    const key = m.adventureKey || m.id
    if (!groups.has(key)) groups.set(key, { key, name: m.adventureName || m.name, book: null, map: null })
    const g = groups.get(key)
    const role = m.role || (m.encounters ? 'book' : 'map')
    if (role === 'map') { if (!g.map || m.addedAt > g.map.addedAt) g.map = m }
    else if (!g.book || m.addedAt > g.book.addedAt) g.book = m
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name))
})

async function refresh() {
  parts.value = await listMaps()
}

async function importFiles(event) {
  const files = [...(event.target.files || [])].filter((f) => /pdf$/i.test(f.name) || f.type === 'application/pdf')
  event.target.value = ''
  if (!files.length) return
  error.value = ''
  for (const file of files) {
    busy.value = `Importing ${file.name}…`
    try {
      // "Maps" in the file name is the map PDF; anything else is the book
      const role = /maps?/i.test(file.name) ? 'map' : 'book'
      const meta = await addMap(file)
      const doc = await openPdf(file)
      const fields = {
        role,
        pages: doc.numPages,
        adventureKey: adventureKey(file.name),
        adventureName: adventureName(file.name),
      }
      if (role === 'book') {
        // the rooms of the book, for "Appears in" on a creature
        const { rooms, boxes } = parseRooms(await readBook(doc))
        if (rooms.length) fields.encounters = Object.fromEntries(rooms.map((r) => [r.code, r]))
        fields.boxes = boxes
      }
      await updateMap(meta.id, fields)
      doc.destroy()
    } catch {
      error.value = `Could not import ${file.name}.`
    }
  }
  busy.value = ''
  await refresh()
}

function open(a) {
  opened.value = { title: a.name, book: a.book, map: a.map }
}

/** Corrections for the book, from a JSON file: monster pictures ({ art }) or AI corrections. */
async function improve(book, event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  error.value = ''
  busy.value = `Applying ${file.name}…`
  try {
    const data = JSON.parse(await file.text())
    if (data.art) await updateMap(book.id, { art: data.art })
    if (data.corrections) {
      const doc = await openPdf(await (await import('../lib/mapsDb')).getFile(book.id))
      const { rooms } = parseRooms(await readBook(doc), data.corrections)
      doc.destroy()
      await updateMap(book.id, { encounters: Object.fromEntries(rooms.map((r) => [r.code, r])) })
    }
  } catch {
    error.value = `Could not apply ${file.name}. Check that it is the JSON from the scripts.`
  }
  busy.value = ''
  await refresh()
}

async function rename(a) {
  const name = window.prompt('Name for this adventure', a.name)
  if (!name || !name.trim() || name.trim() === a.name) return
  for (const part of [a.book, a.map].filter(Boolean)) await renameMap(part.id, name.trim())
  await refresh()
}

async function remove(a) {
  if (!window.confirm(`Delete "${a.name}" (book and map) from this device?`)) return
  for (const part of [a.book, a.map].filter(Boolean)) await removeMap(part.id)
  await refresh()
}

onMounted(refresh)
</script>

<template>
  <main class="page maps-page">
    <header class="maps-head">
      <h2 class="pg">
        Adventures
      </h2>
      <label class="btn-like">
        Import PDF
        <input
          type="file"
          accept="application/pdf,.pdf"
          multiple
          hidden
          @change="importFiles"
        >
      </label>
    </header>

    <p
      v-if="busy"
      class="mute"
      role="status"
    >
      {{ busy }}
    </p>
    <p
      v-if="error"
      class="warn"
      role="alert"
    >
      {{ error }}
    </p>

    <section
      v-if="!adventures.length && !busy"
      class="panel item-empty"
    >
      <p>No adventures yet.</p>
      <p class="mute">
        Import the book and the maps of an adventure together. Files with the same name are one adventure.
      </p>
    </section>

    <ul
      v-else
      class="adv-list"
    >
      <li
        v-for="a in adventures"
        :key="a.key"
        class="adv-row"
      >
        <button
          type="button"
          class="adv-open"
          :disabled="!a.book && !a.map"
          @click="open(a)"
        >
          <span class="adv-name">{{ a.name }}</span>
          <span class="adv-parts">
            <span :class="{ ok: a.book }">Book{{ a.book ? '' : ' missing' }}</span>
            <span :class="{ ok: a.map }">Maps{{ a.map ? '' : ' missing' }}</span>
          </span>
        </button>
        <label
          v-if="a.book"
          class="adv-act"
        >
          Improve
          <input
            type="file"
            accept="application/json,.json"
            hidden
            @change="improve(a.book, $event)"
          >
        </label>
        <button
          type="button"
          class="adv-act"
          aria-label="Rename adventure"
          @click="rename(a)"
        >
          Rename
        </button>
        <button
          type="button"
          class="adv-act adv-del"
          aria-label="Delete adventure"
          @click="remove(a)"
        >
          Delete
        </button>
      </li>
    </ul>

    <MapViewer
      v-if="opened"
      :title="opened.title"
      :book="opened.book"
      :map="opened.map"
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
.adv-list { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 8px; }
.adv-row {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
}
.adv-open {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 6px 0;
  background: none;
  border: 0;
  border-radius: 0;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.adv-open:disabled { opacity: .5; cursor: default; }
.adv-name { font-weight: 700; font-size: 17px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.adv-parts { display: flex; gap: 12px; font-size: 13px; color: var(--mute); }
.adv-parts .ok { color: var(--dom, var(--acc)); }
.adv-act { min-height: 36px; padding: 0 10px; border-radius: 10px; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; }
.adv-del { color: var(--warn); }
</style>
