// Equipment catalog: pure helpers (no Vue, no network).
import { newItem } from './items'

export const PAGE_SIZE = 50

/** 25 → "25 gp", 0.1 → "1 sp", 0.01 → "1 cp", null (tiers or modifiers) → "See description". */
export function formatPrice(gp) {
  if (gp === null || gp === undefined || gp === '') return 'See description'
  const n = Number(gp)
  if (!Number.isFinite(n)) return 'See description'
  if (n >= 1) return `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })} gp`
  if (n >= 0.1) return `${Math.round(n * 10)} sp`
  return `${Math.round(n * 100)} cp`
}

export function formatWeight(lb) {
  const n = Number(lb)
  if (lb === null || lb === undefined || lb === '' || !Number.isFinite(n)) return '—'
  return `${n} lb`
}

/** Removes the book markup so the description reads as plain text. The stats are shown separately. */
export function plainText(md = '') {
  return String(md)
    .replace(/^##\s+.*$/m, '')                          // the title is shown on its own
    .replace(/^‹SOURCE.*›\s*$/gm, '')                   // sources are shown on their own
        .replace(/^(?:\*\*)?(?:Price|Weight|Category|Cost|Associated Skill|Accuracy)(?:\*\*)?\b.{0,160}$/gim, '') // header lines, already shown above
    .replace(/‹(?:[^/›]*\/)?([^›]*)›/g, '$1')           // ‹rule/Dungeon Guides› → Dungeon Guides
    .replace(/@\w+\[(?:[^/\]]*\/)?([^\]]*)\]/g, '$1')   // @HL[(M):] → (M): ; @hll[spell/Acid Arrow] → Acid Arrow
    .replace(/::\w+\{[^}]*\}/g, '')                     // ::tabular{...}
    .replace(/::\w+\[[^\]]*\]/g, '')                    // ::hl3[...]
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Inventory type for a catalog category. Best effort: the type can be changed in the item form. */
export function equipmentKind(category = '') {
  const c = String(category).toLowerCase()
  if (/armor/.test(c)) return 'Armor'
  if (/shield/.test(c)) return 'Shield'
  if (/weapon|^(one-handed|two-handed|ranged|light|ammunition)$/.test(c)) return 'Weapon'
  return 'Other'
}

/** A catalog row as a new inventory item. The id keeps the equipment catalog apart from the magic one. */
export function toInventoryItem(row) {
  return newItem({
    n: row.name,
    k: equipmentKind(row.category),
    price: Number(row.price_gp) || 0,
    weight: Number(row.weight_lb) || 0,
    catalogId: `eq-${row.id}`,
    o: [plainText(row.body_md), row.sources && `Source: ${row.sources}`].filter(Boolean).join('\n\n'),
  })
}
