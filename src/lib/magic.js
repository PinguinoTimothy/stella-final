// Magic catalog: pure helpers (no Vue, no network).
import { newItem } from './items'

export const PAGE_SIZE = 50

const COIN = { pp: 10, gp: 1, sp: 0.1, cp: 0.01 }

/** "2,000 gp" → 2000 (in gp). A bare number counts as gp; text without a number is null. */
export function priceValue(price) {
  const s = String(price || '').toLowerCase().replace(/,/g, '')
  const m = s.match(/(\d+(?:\.\d+)?)\s*(pp|gp|sp|cp)\b/i)
  if (m) return Number(m[1]) * COIN[m[2].toLowerCase()]
  const n = s.match(/(\d+(?:\.\d+)?)/)
  return n ? Number(n[1]) : null
}

/** Cheapest first (or dearest first); items without a price always go last. Stable. */
export function sortByPrice(list, direction) {
  const sign = direction === 'desc' ? -1 : 1
  return list
    .map((x, i) => [x, i, priceValue(x.price)])
    .sort((a, b) => (a[2] === null) - (b[2] === null) || (a[2] === null ? 0 : sign * (a[2] - b[2])) || a[1] - b[1])
    .map((e) => e[0])
}

/** A database row as the catalog components read it. */
export function normalizeItem(it) {
  const description = it.descr ?? it.desc ?? it.d ?? ''
  const source = it.source ?? it.src ?? ''
  return {
    id: it.id,
    n: it.name ?? it.n ?? '',
    aura: it.aura ?? '',
    cl: it.cl ?? '',
    slot: it.slot ?? '',
    price: it.price ?? '',
    weight: it.weight ?? '',
    d: description,
    desc: description,
    req: it.requirements ?? it.req ?? '',
    cost: it.cost ?? '',
    group: it.group_name ?? it.group ?? '',
    src: source,
    source,
  }
}

const INVENTORY_KINDS = ['Rod', 'Staff', 'Wand', 'Scroll']

/** A catalog item as a new inventory item. */
export function toInventoryItem(item) {
  return newItem({
    n: item.n,
    k: INVENTORY_KINDS.includes(item.group) ? item.group : 'Wondrous item',
    slot: item.slot || '',
    price: priceValue(item.price) ?? 0,
    weight: Number.parseFloat(item.weight) || 0,
    aura: item.aura || '',
    icl: Number.parseInt(item.cl, 10) || 0,
    catalogId: String(item.id),
    o: [item.d, item.req && `Requirements: ${item.req}`, item.cost && `Cost: ${item.cost}`, item.src && `Source: ${item.src}`].filter(Boolean).join('\n\n'),
  })
}
