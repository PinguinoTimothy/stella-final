// Initiative order: party members and combat monsters, with who is present and whose turn it is.
// Saved in this browser's localStorage. Not synced to the cloud.
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

const KEY = 'stella-initiative-v1'

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

function write(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Storage full or disabled: it still works, it just won't survive a reload.
  }
}

export const useInitiative = defineStore('initiative', () => {
  const saved = read()
  const entries = ref(Array.isArray(saved.entries) ? saved.entries : [])   // { key, label, kind, init, present }
  const round = ref(Number(saved.round) || 1)
  const currentKey = ref(saved.currentKey ?? null)

  // Everyone, in display order: present first, then with an initiative (highest first), PCs before monsters on ties.
  const ordered = computed(() =>
    [...entries.value].sort(
      (a, b) =>
        Number(b.present) - Number(a.present) ||
        Number(a.init == null) - Number(b.init == null) ||
        (b.init ?? 0) - (a.init ?? 0) ||
        (a.kind === b.kind ? 0 : a.kind === 'pc' ? -1 : 1) ||
        a.label.localeCompare(b.label),
    ),
  )

  // The turn order: present people with an initiative.
  const order = computed(() => ordered.value.filter((e) => e.present && e.init != null))

  /** Keeps one entry per party member and per combat monster. Keeps the initiative of those still around. */
  function sync(party, monsters) {
    const wanted = [
      ...party.map((name) => ({ key: `pc:${name}`, label: name, kind: 'pc' })),
      ...monsters.map((name) => ({ key: `mon:${name}`, label: name, kind: 'mon' })),
    ]
    const keys = new Set(wanted.map((w) => w.key))
    entries.value = entries.value.filter((e) => keys.has(e.key))
    for (const w of wanted) {
      const e = entries.value.find((x) => x.key === w.key)
      if (e) e.label = w.label
      else entries.value.push({ ...w, init: null, present: true })
    }
  }

  function find(key) {
    return entries.value.find((e) => e.key === key)
  }

  function setInit(key, raw) {
    const e = find(key)
    if (!e) return
    const v = raw === '' || raw == null ? null : Math.round(Number(raw))
    e.init = Number.isFinite(v) ? v : null
  }

  function setPresent(key, on) {
    const e = find(key)
    if (e) e.present = !!on
  }

  /** Moves to the next turn. After the last one, the round goes up and the order starts again. */
  function next() {
    const list = order.value
    if (!list.length) return
    const i = list.findIndex((e) => e.key === currentKey.value)
    if (i < 0) {
      currentKey.value = list[0].key
    } else if (i === list.length - 1) {
      round.value += 1
      currentKey.value = list[0].key
    } else {
      currentKey.value = list[i + 1].key
    }
  }

  function newRound() {
    round.value = 1
    currentKey.value = null
  }

  watch([entries, round, currentKey], () => write({ entries: entries.value, round: round.value, currentKey: currentKey.value }), { deep: true })

  return { entries, round, currentKey, ordered, order, sync, setInit, setPresent, next, newRound }
})