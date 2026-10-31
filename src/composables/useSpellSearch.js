// Spell search for forms. Asks the database (all spells, not only the list loaded on a screen) and adds
// the custom spells of this character. Requests are paused between keystrokes; only the latest one counts.
import { ref } from 'vue'
import { fetchSpellCatalogPage } from '../lib/supabase'
import { useAppStore } from '../stores/app'

export function useSpellSearch({ delay = 250, limit = 10 } = {}) {
  const app = useAppStore()
  const results = ref([])
  const done = ref(false)          // true once the results belong to the current text
  let timer = 0, requestId = 0

  function clear() {
    clearTimeout(timer)
    requestId++
    results.value = []
    done.value = false
  }

  function search(term) {
    const t = String(term || '').trim()
    clearTimeout(timer)
    if (t.length < 2) { clear(); return }
    done.value = false
    timer = setTimeout(() => run(t), delay)
  }

  async function run(term) {
    const id = ++requestId
    let rows = []
    try {
      rows = (await fetchSpellCatalogPage({ query: term, limit })).rows
    } catch {
      rows = []
    }
    if (id !== requestId) return

    const q = term.toLowerCase()
    const custom = (app.S.db || []).filter((d) => String(d.n || '').toLowerCase().includes(q))
    const catalog = rows.map((r) => ({ ...r, n: r.name, s: r.school, d: r.descr }))

    const seen = new Set()
    results.value = [...custom, ...catalog]
      .filter((s) => {
        const key = String(s.n || '').toLowerCase()
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, limit)
    done.value = true
  }

  return { results, done, search, clear }
}
