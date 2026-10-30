// Pure inventory rules. No Vue in here, so they are easy to test and reuse.
import { ICAT, ICATS, SLOT_ORDER, SLOT_FREE, SLOT_MAX, SLOT_DEFAULT, EQUIPPABLE } from './constants'
import { uid } from './format'

export const itemCat = (it) => ICAT[it.k] || 'other'
export const cmpItem = (a, b) => (b.equipped ? 1 : 0) - (a.equipped ? 1 : 0) || String(a.n).localeCompare(String(b.n))
export const maxOf = (it) => Math.max(0, Number(it.max) || 0)
export const curOf = (it) => Math.max(0, Math.min(maxOf(it), Number(it.cur) || 0))
export const qtyOf = (it) => Math.max(1, Number(it.qty) || 1)
export const isCharged = (it) => maxOf(it) > 0
export const isStack = (it) => !isCharged(it) && (it.k === 'Scroll' || it.k === 'Potion' || qtyOf(it) > 1)
export const isEquippable = (it) => EQUIPPABLE.includes(it.k)
export const isUse = (it) => ['charged', 'use'].includes(itemCat(it)) || isCharged(it)
export const inOwner = (it, o) => o === '' || (o === '__none' ? !it.owner : it.owner === o)

export function newItem(p = {}) {
  return { id: uid(), n: '', owner: '', k: 'Wondrous item', qty: 1, equipped: false, slot: '', cur: 0, max: 0, daily: false, recovery: 'none', o: '', spellName: '', cl: 1, spellLevel: 0, catalogId: '', price: 0, weight: 0, aura: '', icl: 0, ...p }
}

/** Equips `it` in `slot`, unequipping whatever no longer fits for that character. Returns the names it replaced. */
export function equipInto(items, it, slot) {
  it.slot = slot
  const out = [], lim = SLOT_MAX[slot] || 1
  if (slot !== 'Slotless') {
    const same = items.filter((x) => x !== it && x.equipped && (x.owner || '') === (it.owner || '') && x.slot === slot)
    while (same.length >= lim) { const o = same.shift(); o.equipped = false; out.push(o.n) }
  }
  it.equipped = true
  return out
}
export const defaultSlot = (it) => it.slot || SLOT_DEFAULT[it.k] || 'Slotless'

export function groupByCategory(list) {
  return ICATS.map(([id, label]) => ({ id, label, items: list.filter((i) => itemCat(i) === id).sort(cmpItem) })).filter((g) => g.items.length)
}

/** Equipped view: one block per character, one group per body slot, plus the free slots. */
export function loadout(list, own) {
  const owners = []
  list.forEach((it) => { const o = it.owner || ''; if (!owners.includes(o)) owners.push(o) })
  return owners.map((o) => {
    const bySlot = {}
    list.filter((it) => (it.owner || '') === o).forEach((it) => { const s = it.slot || 'Slotless'; (bySlot[s] = bySlot[s] || []).push(it) })
    const order = SLOT_ORDER.concat(Object.keys(bySlot).filter((k) => !SLOT_ORDER.includes(k)))
    const slots = order.filter((s) => bySlot[s]).map((s) => {
      const lim = SLOT_MAX[s] || 1
      return { slot: s, items: bySlot[s], lim, over: bySlot[s].length > lim, counted: s !== 'Slotless' }
    })
    return { owner: o, slots, free: o ? SLOT_FREE.filter((s) => !bySlot[s]) : [] }
  })
}
