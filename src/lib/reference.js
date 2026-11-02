// Name-only reference search. Descriptions and other fields are never matched.
import { CONDITIONS } from './conditions'
import { SB_ANON, SB_URL } from './supabase'
import { SKILLS, skItems, skillTags } from './skills'
import { UMR } from './umr'

export const MAGIC_SELECT = 'id,name,aura,cl,slot,price,weight,descr,requirements,cost,group_name,source'

// Characters with a meaning in PostgREST filters or LIKE patterns are removed from the search text.
const clean = (q) => String(q || '').replace(/[*(),"\\%_]/g, ' ').replace(/\s+/g, ' ').trim()

/** Rows of `table` whose name contains the text. Only the name column is searched. */
export async function namesContaining(table, query, limit, { select = '*', filters = {} } = {}) {
  const q = clean(query)
  if (!q) return []
  const params = new URLSearchParams({ select, order: 'name.asc', limit: String(limit) })
  params.set('name', `ilike.*${q}*`)
  for (const [key, value] of Object.entries(filters)) params.set(key, value)
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, {
    headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` },
    cache: 'no-store',
  })
  if (!r.ok) throw new Error(`${table} ${r.status}`)
  return r.json()
}

/** Conditions whose name contains the text. */
export function localConditions(query) {
  const t = clean(query).toLowerCase()
  return t ? CONDITIONS.filter((c) => c.name.toLowerCase().includes(t)) : []
}

/** Skills whose name contains the text, ready to show with all their sections. */
export function localSkills(query) {
  const t = clean(query).toLowerCase()
  if (!t) return []
  return SKILLS
    .filter((s) => s[0].toLowerCase().includes(t))
    .map((s) => ({ name: s[0], tags: skillTags(s), sections: s[3].map((sec) => [sec[0], skItems(sec)]) }))
}

/** Monster rules whose name contains the text. */
export function localRules(query) {
  const t = clean(query).toLowerCase()
  if (!t) return []
  return UMR
    .filter((r) => r[0].toLowerCase().includes(t))
    .sort((a, b) => a[0].localeCompare(b[0]))
}