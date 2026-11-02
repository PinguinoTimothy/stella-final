<script setup>
// The creatures of the book page you are reading, grouped by room. A room counts for this page when its
// heading is on it; if none starts here, the last room started before it is shown as a continuation.
// Combat: each creature, each room, or the whole page at once. "Map" moves the map to that room.
import { computed, ref } from 'vue'
import RefLink from '../Refs/RefLink.vue'
import { findMonsterByName } from '../../lib/bestiaryLookup'
import { useAppStore } from '../../stores/app'
import { useMonsterFights } from '../../stores/monsterFights'

const props = defineProps({
  encounters: { type: Object, default: () => ({}) },   // code → room, from the book
  page: { type: Number, default: 1 },                  // the book page being read
  art: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['show-room'])

const app = useAppStore()
const fights = useMonsterFights()
const busy = ref(false)

const byCode = (a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })
const all = computed(() => Object.values(props.encounters))

const startsHere = computed(() => all.value.filter((r) => r.page === props.page).sort(byCode))
const continuing = computed(() => {
  if (startsHere.value.length) return null
  const before = all.value.filter((r) => r.page < props.page).sort((a, b) => b.page - a.page || byCode(b, a))
  return before[0] || null
})
const shown = computed(() => (startsHere.value.length ? startsHere.value : continuing.value ? [continuing.value] : []))

// every creature of the page, once each
const pageCreatures = computed(() => {
  const seen = new Set()
  const out = []
  for (const r of shown.value) for (const c of r.creatures || []) if (!seen.has(c.name)) { seen.add(c.name); out.push(c) }
  return out
})

/** Adds one creature to the combat tracker. False if it is not in the bestiary. */
async function addOne(name) {
  const row = await findMonsterByName(name)
  if (!row) { app.notify(`${name} is not in the bestiary.`); return false }
  await fights.add(row.url, row.name)
  return true
}

async function addList(list, label) {
  busy.value = true
  let added = 0
  for (const c of list) if (await addOne(c.name)) added++
  busy.value = false
  if (added) app.notify(`${added} ${label} added to combat.`)
}
</script>

<template>
  <details class="enc" open>
    <summary class="enc-summary">
      Creatures on this page
      <span class="mute">({{ pageCreatures.length }})</span>
    </summary>

    <p v-if="!shown.length" class="enc-none">No room starts on this page.</p>
    <p v-else-if="continuing" class="enc-note">Continues from {{ continuing.code }} · {{ continuing.title }}</p>

    <details v-for="r in shown" :key="r.code + r.page" class="enc-room" open>
      <summary class="enc-head">
        <span class="enc-code">{{ r.code }}</span>
        <strong class="enc-title">{{ r.title }}</strong>
        <span v-if="r.cr" class="enc-cr">CR {{ r.cr }}</span>
        <span class="mute enc-count">{{ r.creatures?.length || 0 }}</span>
        <button type="button" class="enc-map" @click.stop.prevent="emit('show-room', r.code)">Map</button>
      </summary>

      <div v-if="r.creatures?.length" class="enc-creatures">
        <div v-for="c in r.creatures" :key="c.name" class="enc-creature">
          <img v-if="art[c.name]" :src="art[c.name]" :alt="c.name" class="enc-art" />
          <RefLink kind="monster" :name="c.name" />
          <span class="enc-meta">CR {{ c.cr || '—' }}<template v-if="c.xp"> · XP {{ c.xp.toLocaleString('en-US') }}</template></span>
          <button type="button" class="enc-add" :disabled="busy" @click="addOne(c.name)">+ Combat</button>
        </div>
        <button v-if="r.creatures.length > 1" type="button" class="enc-start" :disabled="busy" @click="addList(r.creatures, 'creatures')">
          Start combat with this room ({{ r.creatures.length }})
        </button>
      </div>
      <p v-else class="enc-none">No creatures in this room.</p>
    </details>

    <div v-if="pageCreatures.length > 1" class="enc-page">
      <button type="button" class="enc-start" :disabled="busy" @click="addList(pageCreatures, 'creatures')">
        Start combat with this page ({{ pageCreatures.length }})
      </button>
    </div>
  </details>
</template>

<style scoped>
.enc { color: var(--ink); font-size: 14px; line-height: 1.4; margin-bottom: 10px; }
.enc-summary { cursor: pointer; font-family: var(--disp); font-size: 20px; padding: 2px 0 8px; list-style: none; }
.enc-summary::-webkit-details-marker { display: none; }
.enc-summary::before { content: '▾ '; color: var(--acc); }
.enc[open] > .enc-summary::before { content: '▾ '; }
.enc:not([open]) > .enc-summary::before { content: '▸ '; }
.enc-room summary { list-style: none; }
.enc-room summary::-webkit-details-marker { display: none; }
.enc-count { font-size: 12px; }
.enc-room { padding: 0 0 10px; margin-bottom: 10px; border-bottom: 1px solid var(--line); }
.enc-room > summary { cursor: pointer; }
.enc-room:last-of-type { border-bottom: 0; }
.enc-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 10px; margin-bottom: 6px; }
.enc-code { padding: 1px 9px; border-radius: 8px; background: var(--acc); color: #111; font-weight: 800; }
.enc-title { font-family: var(--disp); font-size: 20px; font-weight: 400; line-height: 1.15; }
.enc-cr { color: var(--mute); }
.enc-map { margin-left: auto; min-height: 30px; padding: 0 10px; border-radius: 8px; font-size: 13px; cursor: pointer; }
.enc-note { margin: 0 0 10px; color: var(--mute); font-style: italic; }
.enc-creatures { display: grid; gap: 4px; }
.enc-creature { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.enc-art { width: 44px; height: 44px; object-fit: contain; border-radius: 8px; background: #05090d; flex: none; }
.enc-meta { color: var(--mute); font-size: 13px; }
.enc-add { margin-left: auto; min-height: 30px; padding: 0 10px; border-radius: 8px; font-size: 13px; cursor: pointer; }
.enc-start { margin-top: 6px; min-height: 34px; padding: 0 12px; border-radius: 10px; cursor: pointer; }
.enc-page { margin-top: 8px; padding-top: 8px; border-top: 2px solid var(--line); }
.enc-none { color: var(--mute); margin: 0; }
</style>
