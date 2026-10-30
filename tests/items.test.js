import { describe, expect, it } from 'vitest'
import { equipInto, groupByCategory, isCharged, isStack, loadout, newItem } from '../src/lib/items'

const mk = (o) => newItem({ n: 'x', ...o })

describe('items rules', () => {
  it('rings: two fit, the third replaces the oldest', () => {
    const a = mk({ n: 'A', k: 'Ring', owner: 'Bob' }), b = mk({ n: 'B', k: 'Ring', owner: 'Bob' }), c = mk({ n: 'C', k: 'Ring', owner: 'Bob' })
    const all = [a, b, c]
    equipInto(all, a, 'Ring'); equipInto(all, b, 'Ring')
    expect(equipInto(all, c, 'Ring')).toEqual(['A'])
    expect([a.equipped, b.equipped, c.equipped]).toEqual([false, true, true])
  })
  it('one slot per character: another character is not affected', () => {
    const a = mk({ k: 'Armor', owner: 'Bob' }), b = mk({ k: 'Armor', owner: 'Ann' })
    equipInto([a, b], a, 'Armor'); equipInto([a, b], b, 'Armor')
    expect(a.equipped && b.equipped).toBe(true)
  })
  it('classifies charged items and stacks', () => {
    expect(isCharged(mk({ k: 'Wand', max: 50 }))).toBe(true)
    expect(isStack(mk({ k: 'Potion' }))).toBe(true)
    expect(isStack(mk({ k: 'Wand', max: 5, qty: 3 }))).toBe(false)
  })
  it('groups by category and builds the loadout with free slots', () => {
    const list = [mk({ n: 'Ring', k: 'Ring', owner: 'Bob', equipped: true, slot: 'Ring' }), mk({ n: 'Wand', k: 'Wand' }), mk({ n: 'Sword', k: 'Weapon' })]
    expect(groupByCategory(list).map((g) => g.id)).toEqual(['gear', 'worn', 'charged'])
    const lo = loadout(list.filter((i) => i.equipped), '')
    expect(lo[0].owner).toBe('Bob'); expect(lo[0].slots[0]).toMatchObject({ slot: 'Ring', lim: 2, over: false })
    expect(lo[0].free).not.toContain('Ring')
  })
})
