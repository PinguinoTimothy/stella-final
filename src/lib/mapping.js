// Translates the app state <-> the Supabase tables (see schema.sql).
// This is the contract shared with the single-file version: keep both in sync.
import { uid } from './format'

/* [js key, column, type]  s string · n number · q nullable number · b boolean · j json */
export const M_ITEM = [['id', 'id', 's'], ['owner', 'owner', 's'], ['n', 'name', 's'], ['k', 'kind', 's'], ['qty', 'qty', 'n'], ['equipped', 'equipped', 'b'], ['slot', 'slot', 's'], ['cur', 'charges', 'n'], ['max', 'max_charges', 'n'], ['daily', 'daily', 'b'], ['recovery', 'recovery', 's'], ['o', 'notes', 's'], ['spellName', 'spell_name', 's'], ['cl', 'cl', 'n'], ['spellLevel', 'spell_level', 'n'], ['catalogId', 'catalog_id', 's'], ['price', 'price', 'n'], ['weight', 'weight', 'n'], ['aura', 'aura', 's'], ['icl', 'icl', 'n']]
export const M_FX = [['id', 'id', 's'], ['n', 'name', 's'], ['k', 'kind', 's'], ['tg', 'target', 's'], ['targets', 'targets', 'j'], ['rem', 'rem', 'q'], ['tot', 'tot', 'q'], ['cl', 'cl', 'n'], ['note', 'note', 's']]
export const M_CLS = [['id', 'id', 's'], ['name', 'name', 's'], ['pre', 'pre', 's'], ['lvl', 'lvl', 'n'], ['type', 'type', 's'], ['ab', 'ab', 's'], ['score', 'score', 'n'], ['cl', 'cl', 'n'], ['abbr', 'abbr', 's'], ['dcb', 'dcb', 'n'], ['dom', 'dom', 'b'], ['all', 'all_spells', 'b'], ['domains', 'domains', 'j'], ['dsel', 'dsel', 'j'], ['sf', 'sf', 'j'], ['base', 'base', 'j'], ['used', 'used', 'j'], ['dused', 'dused', 'j']]
export const M_CSP = [['id', 'id', 's'], ['n', 'name', 's'], ['note', 'note', 's'], ['prep', 'prep', 'n'], ['left', 'copies_left', 'n'], ['dom', 'dom', 'b'], ['dcb', 'dcb', 'n']]
export const M_SPELL = [['id', 'id', 's'], ['n', 'name', 's'], ['s', 'school', 's'], ['tag', 'tag', 's'], ['lv', 'lv', 's'], ['ct', 'ct', 's'], ['rng', 'rng', 's'], ['area', 'area', 's'], ['eff', 'eff', 's'], ['tg', 'tg', 's'], ['dur', 'dur', 's'], ['sv', 'sv', 's'], ['sr', 'sr', 's'], ['src', 'src', 's'], ['comp', 'comp', 's'], ['cost', 'cost', 's'], ['rt', 'rt', 'n'], ['d', 'descr', 's'], ['deity', 'deity', 's'], ['dom', 'domain', 's']]
export const M_MAGIC = [['id', 'id', 's'], ['n', 'name', 's'], ['aura', 'aura', 's'], ['cl', 'cl', 's'], ['slot', 'slot', 's'], ['price', 'price', 's'], ['weight', 'weight', 's'], ['desc', 'descr', 's'], ['req', 'requirements', 's'], ['cost', 'cost', 's'], ['group', 'group_name', 's'], ['source', 'source', 's'], ['full', 'fulltext', 's']]

export function cv(v, t) {
  if (t === 'n') return Number.isFinite(+v) ? +v : 0
  if (t === 'q') return v == null || v === '' || !Number.isFinite(+v) ? null : +v
  if (t === 'b') return !!v
  if (t === 'j') return v == null ? [] : v
  return v == null ? '' : String(v)
}

/** Object -> table row. Keys without a column go to `extra`, so nothing is ever lost. */
export function toRow(o, map, skip = []) {
  const r = {}, used = {}, x = {}
  map.forEach((m) => { r[m[1]] = cv(o[m[0]], m[2]); used[m[0]] = 1 })
  skip.forEach((k) => { used[k] = 1 })
  Object.keys(o).forEach((k) => { if (!used[k]) x[k] = o[k] })
  r.extra = x
  return r
}

export function fromRow(r, map) {
  const o = r.extra && typeof r.extra === 'object' ? { ...r.extra } : {}
  map.forEach((m) => { const v = r[m[1]]; if (m[2] === 'q' || v != null) o[m[0]] = v })
  return o
}

/** Every record needs a unique, stable id before it can become a row. */
export function ensureIds(S) {
  const seen = {}
  const fix = (o, pre = '') => { if (!o.id || seen[o.id]) o.id = pre + uid(); seen[o.id] = 1 }
  ;(S.items || []).forEach((x) => fix(x))
  ;(S.fx || []).forEach((x) => fix(x))
  ;(S.db || []).forEach((x) => fix(x, 'c-'))
  ;(S.cl || []).forEach((c) => { fix(c); (c.sp || []).forEach((a) => a.forEach((x) => fix(x))) })
}

export function buildRows(S, party) {
  ensureIds(S)
  const R = { characters: {}, wallets: {}, caster_classes: {}, class_spells: {}, items: {}, effects: {}, spells: {}, settings: {} }
  party.forEach((n, i) => { R.characters[n] = { name: n, position: i } })
  const w = S.money
  if (w) {
    const c = { pp: Math.max(0, +w.pp || 0), gp: Math.max(0, +w.gp || 0), sp: Math.max(0, +w.sp || 0), cp: Math.max(0, +w.cp || 0) }
    if (c.pp || c.gp || c.sp || c.cp) R.wallets[''] = { owner: '', ...c }
  }
  ;(S.cl || []).forEach((c, i) => {
    const r = toRow(c, M_CLS, ['sp']); r.position = i; R.caster_classes[c.id] = r
    ;(c.sp || []).forEach((arr, L) => arr.forEach((x, j) => { const q = toRow(x, M_CSP); q.class_id = c.id; q.lvl = L; q.position = j; R.class_spells[x.id] = q }))
  })
  ;(S.items || []).forEach((x, i) => { const r = toRow(x, M_ITEM); r.position = i; R.items[x.id] = r })
  ;(S.fx || []).forEach((x, i) => { const r = toRow(x, M_FX); r.position = i; R.effects[x.id] = r })
  ;(S.db || []).forEach((x, i) => { const r = toRow(x, M_SPELL); r.custom = true; r.position = i; R.spells[x.id] = r })
  R.settings.name = { key: 'name', value: S.name || '' }
  R.settings.rate = { key: 'rate', value: S.rate || {} }
  R.settings.history = { key: 'history', value: S.log || [] }
  R.settings.conditions = { key: 'conditions', value: S.cond || [] }
  R.settings.funds_done = { key: 'funds_done', value: true }
  return R
}

export function snapOf(R) {
  const o = {}
  Object.keys(R).forEach((t) => { o[t] = {}; Object.keys(R[t]).forEach((k) => { o[t][k] = JSON.stringify(R[t][k]) }) })
  return o
}

/** What changed since the last synced snapshot: { changes: {table: {up, del}}, n } */
export function diff(R, snap) {
  const changes = {}; let n = 0; snap = snap || {}
  Object.keys(R).forEach((t) => {
    const old = snap[t] || {}, up = [], del = []
    Object.keys(R[t]).forEach((k) => { if (old[k] !== JSON.stringify(R[t][k])) up.push(R[t][k]) })
    Object.keys(old).forEach((k) => { if (!(k in R[t])) del.push(k) })
    if (up.length || del.length) { changes[t] = { up, del }; n += up.length + del.length }
  })
  return { changes, n }
}

export function fullChanges(R) {
  const ch = {}
  Object.keys(R).forEach((t) => { ch[t] = { up: Object.values(R[t]), del: [] } })
  return ch
}

const byPos = (a) => a.slice().sort((x, y) => (x.position || 0) - (y.position || 0))

/** Tables (arrays of rows) -> app state. `mig` is true if the cloud predates the single-wallet change. */
export function buildState(T) {
  const ns = { name: '', cl: [], items: [], db: [], rate: {}, fx: [], money: {}, log: [], cond: [] }, sp = {}
  T.settings.forEach((r) => {
    if (r.key === 'name') ns.name = r.value || ''
    if (r.key === 'rate') ns.rate = r.value || {}
    if (r.key === 'history') ns.log = Array.isArray(r.value) ? r.value : []
    if (r.key === 'conditions') ns.cond = Array.isArray(r.value) ? r.value : []
  })
  byPos(T.class_spells).forEach((r) => { (sp[r.class_id] = sp[r.class_id] || []).push(r) })
  byPos(T.caster_classes).forEach((r) => {
    const c = fromRow(r, M_CLS); c.sp = Array.from({ length: 10 }, () => [])
    ;(sp[r.id] || []).forEach((q) => { if (q.lvl >= 0 && q.lvl < 10) c.sp[q.lvl].push(fromRow(q, M_CSP)) })
    ns.cl.push(c)
  })
  byPos(T.items).forEach((r) => ns.items.push(fromRow(r, M_ITEM)))
  byPos(T.effects).forEach((r) => ns.fx.push(fromRow(r, M_FX)))
  byPos(T.spells).forEach((r) => ns.db.push(fromRow(r, M_SPELL)))
  const done = T.settings.some((r) => r.key === 'funds_done')
  T.wallets.forEach((r) => {
    if (r.owner === '' || !done) ['pp', 'gp', 'sp', 'cp'].forEach((c) => { ns.money[c] = (ns.money[c] || 0) + (+r[c] || 0) })
  })
  return { s: ns, mig: !done, party: byPos(T.characters).map((r) => r.name) }
}
