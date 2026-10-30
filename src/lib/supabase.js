// Thin REST client for Supabase (no SDK needed). The anon key is public by design:
// what players can read or write is decided by the policies in schema.sql.
export const SB_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cummutyqxwalqeiahgtp.supabase.co'
export const SB_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1bW11dHlxeHdhbHFlaWFoZ3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMjA3NTgsImV4cCI6MjEwODc5Njc1OH0.HHYZ8w8xVr1t7bCUNr41x42zHkzXu3v5VOy6-YPtjEg'

const headers = (tok) => ({ apikey: SB_ANON, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json', Prefer: 'return=minimal' })

async function fail(r) {
  let b = {}
  try { b = await r.json() } catch { /* empty body */ }
  throw { code: r.status, msg: b.message || b.error_description || '' }
}

export async function passwordLogin(email, password) {
  const r = await fetch(SB_URL + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: SB_ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
  if (!r.ok) await fail(r)
  return toSession(await r.json(), email)
}

export async function refresh(session) {
  const r = await fetch(SB_URL + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: SB_ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: session.rt }) })
  if (!r.ok) throw { code: 401, msg: 'session expired' }
  return toSession(await r.json(), session.email)
}

const toSession = (d, email) => ({ at: d.access_token, rt: d.refresh_token, exp: Date.now() + (d.expires_in || 3600) * 1000, email })

/** Reads every row of a table, 1000 at a time. */
export async function fetchAll(tok, table, query, order) {
  let all = []
  for (let off = 0; ; off += 1000) {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?${query}&order=${order}.asc&limit=1000&offset=${off}`, { headers: headers(tok), cache: 'no-store' })
    if (!r.ok) await fail(r)
    const rows = await r.json()
    all = all.concat(rows)
    if (rows.length < 1000) return all
  }
}

export async function fetchRev(tok) {
  const r = await fetch(SB_URL + '/rest/v1/sync_state?id=eq.main&select=rev,updated_at', { headers: headers(tok), cache: 'no-store' })
  if (!r.ok) await fail(r)
  const rows = await r.json()
  return rows[0] || null
}

const PK = { characters: 'name', wallets: 'owner', settings: 'key' }
const TABLES = ['characters', 'wallets', 'caster_classes', 'class_spells', 'items', 'effects', 'settings']

export async function fetchState(tok) {
  const [rows, spells] = await Promise.all([
    Promise.all(TABLES.map((t) => fetchAll(tok, t, 'select=*', PK[t] || 'id'))),
    fetchAll(tok, 'spells', 'custom=eq.true&select=*', 'id'),
  ])
  const T = {}; TABLES.forEach((t, i) => { T[t] = rows[i] }); T.spells = spells
  return T
}

/** Atomic save. Throws { conflict: true } when another device saved first (HTTP 409). */
export async function applyChanges(tok, expected, changes, full) {
  const r = await fetch(SB_URL + '/rest/v1/rpc/apply_changes', { method: 'POST', headers: headers(tok), body: JSON.stringify({ expected: expected ?? 0, changes, full: !!full }) })
  if (r.status === 409) throw { conflict: true }
  if (!r.ok) await fail(r)
  return +(await r.json())
}

export async function fetchPartyView() {
  const r = await fetch(
    `${SB_URL}/rest/v1/party_state?id=eq.main&select=data,updated_at`,
    {
      headers: {
        apikey: SB_ANON,
        Authorization: `Bearer ${SB_ANON}`,
      },
      cache: 'no-store',
    },
  )

  if (!r.ok) await fail(r)

  const rows = await r.json()
  return rows[0] || null
}



export async function fetchSpellCatalogPage({
  offset = 0,
  limit = 50,
  query = '',
  school = '',
  classAliases = [],
  level = '',
  rating = '',
    domains = [],

} = {}) {
  const params = new URLSearchParams({
    select: '*',
    custom: 'eq.false',
    order: 'name.asc,id.asc',
    limit: String(limit),
    offset: String(offset),
  })

  const safe = value =>
    String(value ?? '')
      .replace(/[(),."\\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  
const conditions = []

const domainNames = domains
  .map(safe)
  .filter(Boolean)

const search = safe(query)

if (search) {
  const fields = [
    'name', 'school', 'descr', 'lv', 'tag',
    'tg', 'area', 'eff', 'comp', 'src',
  ]

  conditions.push(
    `or(${fields.map(field =>
      `${field}.ilike.*${search}*`
    ).join(',')})`
  )
}

const aliases = classAliases
  .map(safe)
  .filter(Boolean)

if (aliases.length && level !== '') {
  const n = safe(level)

  conditions.push(
    `or(${aliases.map(alias =>
      `lv.ilike.*${alias}${n}*`
    ).join(',')})`
  )
} else if (aliases.length) {
  conditions.push(
    `or(${aliases.map(alias =>
      `lv.ilike.*${alias}*`
    ).join(',')})`
  )
} else if (level !== '' && !domainNames.length) {
    const n = safe(level)

  const classNames = [
    'Wizard', 'Wiz', 'Cleric', 'Clr',
    'Sorcerer', 'Sor', 'Druid', 'Drd',
    'Oracle', 'Orc', 'Bard', 'Brd',
    'Magus', 'Mag', 'Warpriest', 'Wpr',
    'Paladin', 'Pal', 'Ranger', 'Rgr',
    'Antipaladin', 'Apal',
  ]

  conditions.push(
    `or(${classNames.map(name =>
      `lv.ilike.*${name}${n}*`
    ).join(',')})`
  )
}


if (domainNames.length && level !== '') {
  const n = safe(level)

  conditions.push(
    `or(${domainNames.map(name =>
      `domain.ilike.*${name} (${n})*`
    ).join(',')})`
  )
}

if (conditions.length === 1) {
  params.set('or', conditions[0].slice(2))
} else if (conditions.length > 1) {
  params.set('and', `(${conditions.join(',')})`)
}

  if (school) {
    params.set('school', `ilike.${safe(school)}*`)
  }

  if (rating !== '') {
    params.set('rt', `eq.${safe(rating)}`)
  }

  const response = await fetch(
    `${SB_URL}/rest/v1/spells?${params.toString()}`,
    {
      headers: {
        ...headers(SB_ANON),
        Prefer: 'count=exact',
      },
      cache: 'no-store',
    }
  )

  if (!response.ok) await fail(response)

  const rows = await response.json()
  const range = response.headers.get('Content-Range') || ''
  const total = Number(range.split('/')[1])

  return {
    rows,
    total: Number.isFinite(total) ? total : rows.length,
    hasMore: offset + rows.length < total,
  }
}

/**
 * Reads only the rating column to populate the filter.
 */
export async function fetchSpellRatings() {
  const values = new Set()
  let offset = 0
  const limit = 1000

  while (true) {
    const params = new URLSearchParams({
      select: 'rt',
      custom: 'eq.false',
      order: 'rt.asc',
      limit: String(limit),
      offset: String(offset),
    })

    const response = await fetch(
      `${SB_URL}/rest/v1/spells?${params.toString()}`,
      {
        headers: headers(SB_ANON),
        cache: 'no-store',
      }
    )

    if (!response.ok) await fail(response)

    const rows = await response.json()

    rows.forEach(row => {
      if (row.rt !== null && row.rt !== undefined && row.rt !== '') {
        values.add(String(row.rt))
      }
    })

    if (rows.length < limit) break
    offset += limit
  }

  return [...values].sort((a, b) => Number(a) - Number(b))
}
