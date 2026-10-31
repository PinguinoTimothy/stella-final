// Monster fights in progress: several open at once, each with its own HP.
// Saved in this browser's localStorage, so they survive a reload. Not synced to the cloud.
import { defineStore } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'
import { combatSummary, fetchMonsterDetail } from '../lib/monsters'

const KEY = 'stella-monster-fights-v1'
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))

function readSaved() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

function writeSaved(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // Storage full or disabled: the fights still work, they just won't survive a reload.
  }
}

export const useMonsterFights = defineStore('monsterFights', () => {
  const fights = ref([])
  const activeUid = ref(null)
  let seq = 0

  const active = computed(() => fights.value.find((f) => f.uid === activeUid.value) || null)
  const activeIndex = computed(() => fights.value.findIndex((f) => f.uid === activeUid.value))

  function make(data) {
    return reactive({
      uid: ++seq,
      url: data.url,
      name: data.name || 'Monster',
      hp: Number(data.hp) || 0,
      maxHp: Number(data.maxHp) || 0,
      card: null,
      error: '',
      loading: true,
      open: false,
    })
  }

  /** Loads the stat block. `fresh` means a new fight: HP starts at the maximum. */
  async function fetchCard(entry, fresh) {
    entry.loading = true
    entry.error = ''
    try {
      const data = await fetchMonsterDetail(entry.url)
      if (!data) throw new Error('not found')
      const card = combatSummary(data)
      entry.card = card
      const max = Math.max(0, Number(card.hp) || 0)
      if (fresh) {
        entry.maxHp = max
        entry.hp = max
      } else if (!entry.maxHp) {
        entry.maxHp = max
      }
    } catch {
      entry.error = 'Could not load this monster.'
    } finally {
      entry.loading = false
    }
  }

  /** Adds one fight. Copies of the same monster are numbered: Wolf, Wolf 2, Wolf 3… */
  async function add(url, baseName) {
    const copies = fights.value.filter((f) => f.url === url).length
    const entry = make({ url, name: copies ? `${baseName} ${copies + 1}` : baseName })
    fights.value.push(entry)
    activeUid.value = entry.uid
    await fetchCard(entry, true)
    return entry
  }

  /** Brings back the fights saved in this browser. */
  function restore() {
    readSaved()
      .filter((s) => s && s.url)
      .forEach((s) => {
        const entry = make(s)
        fights.value.push(entry)
        fetchCard(entry, false)
      })
    if (fights.value.length) activeUid.value = fights.value[0].uid
  }
  restore()

  watch(
    fights,
    (list) => writeSaved(list.map((f) => ({ url: f.url, name: f.name, hp: f.hp, maxHp: f.maxHp }))),
    { deep: true },
  )

  function show(uid) {
    if (fights.value.some((f) => f.uid === uid)) activeUid.value = uid
  }

  function step(delta) {
    const n = fights.value.length
    if (!n) return
    const i = (activeIndex.value + delta + n) % n
    activeUid.value = fights.value[i].uid
  }

  function remove(uid) {
    const i = fights.value.findIndex((f) => f.uid === uid)
    if (i < 0) return
    fights.value.splice(i, 1)
    if (activeUid.value === uid) {
      const next = fights.value[Math.min(i, fights.value.length - 1)]
      activeUid.value = next ? next.uid : null
    }
  }

  /** HP stays between -max and max. At 0 or less the creature is down. */
  function setHp(uid, value) {
    const f = fights.value.find((x) => x.uid === uid)
    if (!f) return
    f.hp = clamp(Math.round(Number(value) || 0), -f.maxHp, f.maxHp)
  }

  function change(uid, delta) {
    const f = fights.value.find((x) => x.uid === uid)
    if (f) setHp(uid, f.hp + delta)
  }

  function reset(uid) {
    const f = fights.value.find((x) => x.uid === uid)
    if (f) setHp(uid, f.maxHp)
  }

  function toggle(uid) {
    const f = fights.value.find((x) => x.uid === uid)
    if (f) f.open = !f.open
  }

  function clearAll() {
    fights.value = []
    activeUid.value = null
  }

  return { fights, active, activeIndex, add, show, step, remove, setHp, change, reset, toggle, clearAll }
})