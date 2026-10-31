// Bestiary queries (Supabase table `monsters`, see supabase/monsters.sql).
// Read-only from the app; the anon key can read the table, writes go through the admin script.
import { SB_ANON, SB_URL } from './supabase'

const LIST_COLUMNS = 'url,name,cr,type,size,hp,ac,touch,flat_footed,cmb,cmd'

export const CR_OPTIONS = [0, 0.125, 0.25, 0.5, ...Array.from({ length: 30 }, (_, i) => i + 1)]

const FRACTIONS = { 0.125: '1/8', 0.25: '1/4', 0.5: '1/2' }
export const crLabel = (cr) => FRACTIONS[cr] ?? String(cr)

export const signed = (n) => (n == null || n === '' ? '—' : `${Number(n) >= 0 ? '+' : ''}${n}`)
export const abilityMod = (score) => Math.floor((Number(score) - 10) / 2)

async function get(path, params, extra = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}?${params}`, {
    headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}`, ...extra },
    cache: 'no-store',
  })
  if (!r.ok) throw new Error(`Monsters request failed (${r.status})`)
  return r
}

// Characters that mean something in PostgREST filters are dropped from the search text.
const cleanQuery = (q) => String(q || '').replace(/[*(),"\\]/g, '').trim()

/** One page of the bestiary, sorted by name. Returns { rows, total }. */
export async function fetchMonsterPage({ query = '', type = '', cr = '', offset = 0, limit = 40 } = {}) {
  const p = new URLSearchParams({
    select: LIST_COLUMNS,
    order: 'name.asc',
    limit: String(limit),
    offset: String(offset),
  })
  const q = cleanQuery(query)
  if (q) p.set('name', `ilike.*${q}*`)
  if (type) p.set('type', `eq.${type}`)
  if (cr !== '') p.set('cr', `eq.${cr}`)

  const r = await get('monsters', p, { Prefer: 'count=exact' })
  const rows = await r.json()
  const total = Number((r.headers.get('Content-Range') || '').split('/')[1])
  return { rows, total: Number.isFinite(total) ? total : rows.length }
}

/** Every distinct creature type, for the type filter. Small column, read in pages. */
export async function fetchMonsterTypes() {
  const seen = new Set()
  for (let offset = 0; ; offset += 1000) {
    const p = new URLSearchParams({ select: 'type', order: 'type.asc', limit: '1000', offset: String(offset) })
    const rows = await (await get('monsters', p)).json()
    rows.forEach((row) => row.type && seen.add(row.type))
    if (rows.length < 1000) break
  }
  return [...seen].sort()
}

/** The full record of one monster (its `data` column). */
export async function fetchMonsterDetail(url) {
  const p = new URLSearchParams({ select: 'data', url: `eq.${url}`, limit: '1' })
  const rows = await (await get('monsters', p)).json()
  return rows[0]?.data || null
}

/* ---------- formatting helpers for the raw record ---------- */

const list = (v) => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v])

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

// DR: [{ amount: 5, weakness: 'magic' }] -> "5/magic"
function formatDR(dr) {
  return list(dr)
    .map((x) => (typeof x === 'string' ? x : `${x.amount ?? ''}/${x.weakness || '—'}`))
    .filter(Boolean)
}

// Maps and lists of defences: { fire: 10 } -> "fire 10", { cold: 'vulnerability' } -> "cold vulnerability"
function formatMap(v) {
  if (!v) return []
  if (typeof v === 'string') return [v]
  if (Array.isArray(v)) {
    return v.map((x) => (typeof x === 'string' ? x : x.name ? `${x.name} ${x.value ?? ''}`.trim() : '')).filter(Boolean)
  }
  return Object.entries(v).map(([k, val]) => (val === true ? k : `${k} ${val}`))
}

// special_abilities: { "Breath Weapon (Su)": "text" } or [{ name, text }]
function formatSpecials(v) {
  if (Array.isArray(v)) return v.map((x) => ({ name: x.name || '', text: x.text || '' })).filter((x) => x.name || x.text)
  return Object.entries(v || {}).map(([name, text]) => ({ name, text: String(text) }))
}

// spell_like_abilities: entries grouped by frequency ("At will", "1/day"…)
function formatSLA(sla) {
  const entries = list(sla?.entries)
  if (!entries.length) return null
  const groups = new Map()
  for (const e of entries) {
    const key = e.freq || 'Spell-like'
    const label = [e.name, e.DC ? `(DC ${e.DC})` : '', e.other ? `(${e.other})` : ''].filter(Boolean).join(' ')
    groups.set(key, [...(groups.get(key) || []), label])
  }
  return {
    cl: sla.CL ?? sla.caster_level ?? null,
    groups: [...groups].map(([freq, items]) => ({ freq, items: items.join(', ') })),
  }
}

// spells: entries grouped by level, with the per-day count from sources[0].slots when the file has it
function formatSpellsKnown(spells) {
  const entries = list(spells?.entries)
  if (!entries.length) return null
  const src = list(spells.sources)[0] || {}
  const slots = src.slots || {}
  const levels = new Map()
  for (const e of entries) {
    const lv = Number(e.level) || 0
    const label = [e.name, e.DC ? `(DC ${e.DC})` : '', e.is_domain_spell ? '[domain]' : ''].filter(Boolean).join(' ')
    levels.set(lv, [...(levels.get(lv) || []), label])
  }
  return {
    cl: spells.CL ?? spells.caster_level ?? src.CL ?? src.caster_level ?? null,
    rows: [...levels]
      .sort((a, b) => a[0] - b[0])
      .map(([lv, items]) => {
        const freq = slots[String(lv)]
        const head = lv === 0 ? '0' : ordinal(lv)
        const freqText = freq ? ` (${String(freq).replace('at-will', 'at will')})` : ''
        return { head: `${head}${freqText}`, items: items.join(', ') }
      }),
  }
}

// Plain list of names: accepts strings or { name } objects.
const textList = (v) =>
  list(v).map((x) => (typeof x === 'string' ? x : x?.name || '')).filter(Boolean)

// Gear comes as { combat, other } or as flat fields; either a string or a list.
function gearText(d) {
  const g = d.gear || {}
  const text = (v) => (Array.isArray(v) ? v.join(', ') : String(v || '').trim())
  return {
    combat: text(g.combat ?? d.combat_gear),
    other: text(g.other ?? d.other_gear),
  }
}

/** Turns the raw record into what the combat card needs. Missing fields become null or empty. */
export function combatSummary(d) {
  const ac = d.AC || {}
  const hp = d.HP || {}
  const saves = d.saves || {}

  const speeds = Object.entries(d.speeds || {})
    .map(([k, v]) => `${k === 'base' ? '' : k + ' '}${v} ft`.trim())
    .join(' · ')

  const senses = Object.entries(d.senses || {})
    .filter(([, v]) => v)
    .map(([k, v]) => (v === true ? k : `${k} ${v}`))

  const skills = Object.entries(d.skills || {})
    .filter(([k]) => !k.startsWith('_'))
    .map(([name, v]) => {
      const extra = Object.entries(v || {})
        .filter(([k]) => k !== '_')
        .map(([k, val]) => `${k} ${signed(val)}`)
      return `${name} ${signed(v?._)}${extra.length ? ` (${extra.join(', ')})` : ''}`
    })

  // Attacks come as objects ({ text }) or, for specials, as plain strings.
  const attacks = Object.entries(d.attacks || {}).map(([kind, groups]) => ({
    kind,
    lines: (groups || [])
      .flat()
      .map((a) => (typeof a === 'string' ? a : a?.text || a?.attack))
      .filter(Boolean),
  }))

  // alignment is {raw, cleaned} in the file, a plain string in older exports.
  const alignment = typeof d.alignment === 'object' ? d.alignment?.cleaned || d.alignment?.raw : d.alignment

  const reachText = [
    `Space ${d.space ?? 5} ft.`,
    `Reach ${d.reach ?? 5} ft.`,
  ].join(', ') + (d.reach_other ? ` (${d.reach_other})` : '')

  return {
    name: d.title1 || d.title2 || '',
    cr: crLabel(d.CR ?? 0),
    xp: d.XP ?? null,
    type: d.type || '',
    size: d.size || '',
    alignment: alignment || '',
    hp: hp.total ?? hp.HP ?? null,
    hpLong: hp.long || '',
    ac: ac.AC ?? null,
    touch: ac.touch ?? null,
    flatFooted: ac.flat_footed ?? null,
    cmd: d.CMD ?? null,
    cmdOther: d.CMD_other || '',
    cmb: d.CMB ?? null,
    cmbOther: d.CMB_other || '',
    bab: d.BAB ?? null,
    init: d.initiative?.bonus ?? null,
    saves: { fort: saves.fort ?? null, ref: saves.ref ?? null, will: saves.will ?? null },
    speeds,
    reachText,

    // defence
    dr: formatDR(d.DR),
    immunities: formatMap(d.immunities),
    resistances: formatMap(d.resistances),
    weaknesses: formatMap(d.weaknesses),
    sr: d.SR ?? null,

    // offence
    attacks,
    sla: formatSLA(d.spell_like_abilities),
    spells: formatSpellsKnown(d.spells),

    // statistics
    abilities: Object.entries(d.ability_scores || {}),
    feats: list(d.feats).map((f) => f.name).filter(Boolean),
    skills,
    languages: list(d.languages),
    senses,

    // special
    auras: list(d.auras).map((a) => `${a.name}${a.radius ? ` (${a.radius} ft.)` : ''}`),
    specialQualities: list(d.special_qualities),
    specialAbilities: formatSpecials(d.special_abilities),

    source: (d.sources || []).map((s) => `${s.name}${s.page ? `, p. ${s.page}` : ''}`).join(' · '),
    descShort: d.desc_short || '',
    descLong: d.desc_long || '',

        defensiveAbilities: textList(d.defensive_abilities),
    combatGear: gearText(d).combat,
    otherGear: gearText(d).other,
  }
}