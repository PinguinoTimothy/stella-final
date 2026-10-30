// Spellcasting rules for one caster class. Pure functions: no Vue, no store.
// Slot tables live in classes.js; the data shape is the one the single-file version saved.
import { CLASS_TABLES } from './classes'

/** Makes sure a class has every array and field the rules below read. Mutates `c`. */
export function ensureClass(c) {
  if (!c) return
  for (const key of ['base', 'used', 'dused', 'sp']) if (!Array.isArray(c[key])) c[key] = []
  if (!Array.isArray(c.domains)) c.domains = []
  if (!Array.isArray(c.dsel)) c.dsel = []

  for (let level = 0; level < 10; level++) {
    if (c.base[level] === undefined) c.base[level] = null
    const used = Number(c.used[level])
    c.used[level] = Number.isFinite(used) && used >= 0 ? used : 0
    const dUsed = Number(c.dused[level])
    c.dused[level] = Number.isFinite(dUsed) && dUsed >= 0 ? dUsed : 0
    if (!Array.isArray(c.sp[level])) c.sp[level] = []
    for (const spell of c.sp[level]) {
      if (spell.prep === undefined) spell.prep = 0
      if (spell.left === undefined) spell.left = spell.prep
      if (spell.dom === undefined) spell.dom = false
      if (spell.note === undefined) spell.note = ''
      if (spell.dcb === undefined) spell.dcb = 0
    }
  }
}

export const abilityModifier = (c) => Math.floor(((Number(c?.score) || 10) - 10) / 2)

/** Extra slots a high ability score gives at `level` (level 0 never gets any). */
export const bonusSlots = (modifier, level) => (level >= 1 && modifier >= level ? 1 + Math.floor((modifier - level) / 4) : 0)

/** Slots of `c` at `level`, or null when the class has none there. Cantrips are "at will". */
export function slotInfo(c, level) {
  if (!c) return null
  ensureClass(c)
  if (level === 0) return { level, base: Number(c.base[0]) || 0, bonus: 0, domain: 0, regular: 0, total: 0, atWill: true }

  const base = c.base[level]
  if (base === null || base === undefined || base === '') return null
  if (c.pre && (Number(c.score) || 10) < 10 + level) return null   // ability too low to cast this level

  const bonus = bonusSlots(abilityModifier(c), level)
  const domain = c.dom ? 1 : 0
  const regular = Math.max(0, Number(base) || 0) + bonus
  return { level, base: Number(base) || 0, bonus, domain, regular, total: regular + domain, atWill: false }
}

export const regularUsed = (c, level) => Math.max(0, Number(c?.used?.[level]) || 0)
export const domainUsed = (c, level) => Math.max(0, Number(c?.dused?.[level]) || 0)

export function regularRemaining(c, level) {
  const s = slotInfo(c, level)
  return s ? Math.max(0, s.regular - regularUsed(c, level)) : 0
}
export function domainRemaining(c, level) {
  const s = slotInfo(c, level)
  return s ? Math.max(0, s.domain - domainUsed(c, level)) : 0
}
export const remaining = (c, level) => regularRemaining(c, level) + domainRemaining(c, level)

/** Save DC: 10 + spell level + ability modifier + class bonus + the spell's own bonus. */
export const spellDC = (c, level, spell = null) =>
  10 + level + abilityModifier(c) + (Number(c?.dcb) || 0) + (Number(spell?.dcb) || 0)

/** Normal (non-domain) copies prepared at `level`. */
export const preparedCount = (c, level) =>
  (c?.sp?.[level] || []).reduce((sum, s) => sum + (s.dom ? 0 : Math.max(0, Number(s.prep) || 0)), 0)

export function canPrepare(c, level) {
  const s = slotInfo(c, level)
  if (!s || c.type !== 'prep') return false
  return preparedCount(c, level) < (s.atWill ? s.base : s.regular)
}

/** Can this spell be cast now? Prepared casters also need a copy left. */
export function canCast(c, level, spell) {
  if (!spell || spell.dom) return false
  if (c.type !== 'spont' && Number(spell.left) <= 0) return false
  return regularRemaining(c, level) > 0
}

/** Spells to list at `level`. In cast mode a prepared caster only sees what is prepared. */
export function visibleSpells(c, level, preparing) {
  const spells = (c?.sp?.[level] || []).filter((s) => !s.dom)
  return c?.type === 'prep' && !preparing ? spells.filter((s) => (Number(s.prep) || 0) > 0) : spells
}
export const knownSpells = (c, level) => (c?.sp?.[level] || []).filter((s) => !s.dom)

/** Known-spells limit of a spontaneous caster at `level`, or null when the class has no table. */
export function knownMax(c, level) {
  const table = CLASS_TABLES[c?.pre]?.known
  if (!table) return null
  const v = table[(Number(c.lvl) || 1) - 1]?.[level]
  return v === undefined || v === null ? null : v
}
export const knownCount = (c, level) => knownSpells(c, level).length

/** Class abbreviations used in the catalog's "Clr3, Wiz4" level strings. */
export const classAliases = (c) => String(c?.abbr || '').split(/[\s,/]+/).filter(Boolean)

/** Lowest level at which class `c` gets `spell`, read from its "Wiz 3, Clr 2" string, or null. */
export function spellLevelFor(spell, c) {
  const abbr = String(c?.abbr || c?.name || '').toLowerCase().split(/[\s,/]+/).filter(Boolean)
  const re = /([A-Za-z]+)\s*(\d)/g, levels = []
  let m
  while ((m = re.exec(String(spell?.lv || '')))) if (abbr.includes(m[1].toLowerCase())) levels.push(Number(m[2]))
  return levels.length ? Math.min(...levels) : null
}

export const sameName = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase()

/** A spell as it is stored in a class list (from a catalog row). */
export const newClassSpell = (spell) => ({
  n: String(spell.n || spell.name || '').trim(),
  s: spell.s || spell.school || '',
  d: spell.d || spell.descr || spell.description || '',
  lv: spell.lv || '',
  note: '', prep: 0, left: 0, dom: false, dcb: 0,
})
