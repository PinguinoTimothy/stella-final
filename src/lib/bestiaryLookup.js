// Bestiary access for the encounter links: find a monster by its exact name, then reuse the
// stat block code that the monster catalog already has (fetchMonsterDetail + combatSummary).
import { SB_ANON, SB_URL } from './supabase'
export { combatSummary, fetchMonsterDetail } from './monsters'

/** The bestiary row for a monster name (case-insensitive, exact). Null if it is not in the bestiary. */
export async function findMonsterByName(name) {
  const clean = String(name || '').replace(/[*%_]/g, '').trim()
  if (!clean) return null
  const p = new URLSearchParams({ select: 'url,name', name: `ilike.${clean}`, limit: '1' })
  const r = await fetch(`${SB_URL}/rest/v1/monsters?${p}`, {
    headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` },
    cache: 'no-store',
  })
  if (!r.ok) return null
  const rows = await r.json()
  return rows[0] || null
}
