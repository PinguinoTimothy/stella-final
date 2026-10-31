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


if (domainNames.length) {
  conditions.push(
    `or(${domainNames.map(name =>
      `domain.ilike.*${name}*`
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


/** Reads full spell rows for exact names (case-insensitive fallback for misses). Used by Cast / Active. */
export async function fetchSpellsByNames(names = []) {
  const clean = [...new Set(names.map((n) => String(n || '').trim()).filter(Boolean))]
  if (!clean.length) return []
  const quote = (n) => '"' + n.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
  const get = async (params) => {
    const r = await fetch(`${SB_URL}/rest/v1/spells?${params}`, { headers: headers(SB_ANON), cache: 'no-store' })
    if (!r.ok) await fail(r)
    return r.json()
  }
  const rows = []
  for (let i = 0; i < clean.length; i += 40) {
    const chunk = clean.slice(i, i + 40)
    rows.push(...await get(`select=*&custom=eq.false&name=in.(${chunk.map(quote).join(',')})&limit=200`))
  }
  const found = new Set(rows.map((r) => r.name.toLowerCase()))
  for (const n of clean.filter((n) => !found.has(n.toLowerCase())).slice(0, 10)) {
    const safe = n.replace(/[(),.*"\\%]/g, ' ').replace(/\s+/g, ' ').trim()
    if (safe) rows.push(...await get(`select=*&custom=eq.false&name=ilike.${encodeURIComponent(safe)}&limit=1`))
  }
  return rows
}

/* ---------- Magic catalog: filtered, paged reads (never the whole table) ---------- */

// Everything a card and the details sheet show. `fulltext` is only searched on the server, never downloaded.
const MAGIC_COLUMNS = 'id,position,name,aura,cl,slot,price,weight,descr,requirements,cost,group_name,source'
const MAGIC_SEARCH_FIELDS = ['name', 'slot', 'group_name', 'descr', 'aura', 'source', 'requirements', 'price', 'cl', 'fulltext']

const cleanTerm = (v) => String(v ?? '').replace(/[(),."\\*%]/g, ' ').replace(/\s+/g, ' ').trim()
const likeEscape = (v) => String(v).replace(/[\\%_]/g, '\\$&')

/** PostgREST filters for the catalog screen's search box, group and slot. */
function magicParams({ query = '', group = '', slot = '' } = {}) {
  const p = new URLSearchParams()
  const q = cleanTerm(query)
  if (q) p.set('or', `(${MAGIC_SEARCH_FIELDS.map((f) => `${f}.ilike.*${q}*`).join(',')})`)
  if (group) p.set('group_name', `eq.${group}`)
  if (group.trim().toLowerCase() === 'wondrous item' && slot) p.set('slot', `ilike.${likeEscape(slot.trim())}`)
  return p
}

async function getJson(url, signal, extra = {}) {
  const r = await fetch(url, { headers: { ...headers(SB_ANON), ...extra }, cache: 'no-store', signal })
  if (!r.ok) await fail(r)
  return r
}

/** One page of the catalog. Returns { rows, total }. */
export async function fetchMagicPage({ offset = 0, limit = 50, signal, ...filter } = {}) {
  const p = magicParams(filter)
  p.set('select', MAGIC_COLUMNS); p.set('order', 'position.asc,id.asc'); p.set('limit', String(limit)); p.set('offset', String(offset))
  const r = await getJson(`${SB_URL}/rest/v1/magic_items?${p}`, signal, { Prefer: 'count=exact' })
  const rows = await r.json()
  const total = Number((r.headers.get('Content-Range') || '').split('/')[1])
  return { rows, total: Number.isFinite(total) ? total : rows.length }
}

/** Only id and price of every matching item: enough to sort by price without downloading the items. */
export async function fetchMagicPriceIndex({ signal, ...filter } = {}) {
  const base = magicParams(filter)
  base.set('select', 'id,price'); base.set('order', 'position.asc,id.asc')
  let all = []
  for (let offset = 0; ; offset += 1000) {
    const p = new URLSearchParams(base); p.set('limit', '1000'); p.set('offset', String(offset))
    const rows = await (await getJson(`${SB_URL}/rest/v1/magic_items?${p}`, signal)).json()
    all = all.concat(rows)
    if (rows.length < 1000) return all
  }
}

/** Full rows for the given ids (a price-sorted page), in no particular order. */
export async function fetchMagicByIds(ids, signal) {
  if (!ids.length) return []
  const quote = (v) => '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
  const p = new URLSearchParams({ select: MAGIC_COLUMNS, id: `in.(${ids.map(quote).join(',')})`, limit: String(ids.length) })
  return (await getJson(`${SB_URL}/rest/v1/magic_items?${p}`, signal)).json()
}

/** The values of the Group and Slot selectors. Two small columns, nothing else. */
export async function fetchMagicFacets(signal) {
  const groups = new Set(), slots = new Set()
  for (let offset = 0; ; offset += 1000) {
    const p = new URLSearchParams({ select: 'group_name,slot', order: 'position.asc,id.asc', limit: '1000', offset: String(offset) })
    const rows = await (await getJson(`${SB_URL}/rest/v1/magic_items?${p}`, signal)).json()
    for (const r of rows) {
      const g = String(r.group_name || '').trim(), s = String(r.slot || '').trim()
      if (g) groups.add(g)
      if (g.toLowerCase() === 'wondrous item' && s) slots.add(s)
    }
    if (rows.length < 1000) break
  }
  return { groups: [...groups].sort(), slots: [...slots].sort() }
}

/* ---------- Equipment catalog (view equipment_catalog, see migrations/002_equipment_catalog.sql) ---------- */

const EQUIPMENT_COLUMNS = 'id,base_id,name,kind,heading,category,price_gp,weight_lb,body_md,sources'
const EQUIPMENT_ORDER = {
  name: 'name.asc,id.asc',
  asc: 'price_gp.asc.nullslast,name.asc,id.asc',
  desc: 'price_gp.desc.nullslast,name.asc,id.asc',
}

/** PostgREST filters for the equipment screen: search box and category. */
function equipmentParams({ query = '', category = '' } = {}) {
  const p = new URLSearchParams()
  const q = cleanTerm(query)
  if (q) p.set('or', `(name.ilike.*${q}*,heading.ilike.*${q}*,category.ilike.*${q}*)`)
  if (category) p.set('category', `eq.${category}`)
  return p
}

/** One page of the equipment catalog. Returns { rows, total }. */
export async function fetchEquipmentPage({ offset = 0, limit = 50, sort = 'name', signal, ...filter } = {}) {
  const p = equipmentParams(filter)
  p.set('select', EQUIPMENT_COLUMNS)
  p.set('order', EQUIPMENT_ORDER[sort] || EQUIPMENT_ORDER.name)
  p.set('limit', String(limit))
  p.set('offset', String(offset))
  const r = await getJson(`${SB_URL}/rest/v1/equipment_catalog?${p}`, signal, { Prefer: 'count=exact' })
  const rows = await r.json()
  const total = Number((r.headers.get('Content-Range') || '').split('/')[1])
  return { rows, total: Number.isFinite(total) ? total : rows.length }
}

/** Distinct categories of the catalog, for the filter. Reads one small column. */
export async function fetchEquipmentCategories(signal) {
  const set = new Set()
  for (let offset = 0; ; offset += 1000) {
    const p = new URLSearchParams({ select: 'category', order: 'category.asc,id.asc', limit: '1000', offset: String(offset) })
    const rows = await (await getJson(`${SB_URL}/rest/v1/equipment_catalog?${p}`, signal)).json()
    for (const r of rows) {
      const c = String(r.category || '').trim()
      if (c) set.add(c)
    }
    if (rows.length < 1000) break
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

/** Stats and effects of a base entry (copies share them). Read only when the details sheet opens. */
export async function fetchEquipmentDetail(baseId, signal) {
  const p = new URLSearchParams({
    select: 'item_stat(seq,section,key,value_raw),item_effect(seq,target,qualifier,text)',
    id: `eq.${baseId}`,
    limit: '1',
  })
  const [row] = await (await getJson(`${SB_URL}/rest/v1/item?${p}`, signal)).json()
  const bySeq = (list) => (list || []).slice().sort((a, b) => a.seq - b.seq)
  return { stats: bySeq(row?.item_stat), effects: bySeq(row?.item_effect) }
}
