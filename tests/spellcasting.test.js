import { describe, expect, it } from 'vitest'
import {
  abilityModifier, bonusSlots, canCast, canPrepare, classAliases, ensureClass, knownCount, knownMax, newClassSpell,
  preparedCount, regularRemaining, domainRemaining, remaining, slotInfo, spellDC, spellLevelFor, visibleSpells,
} from '../src/lib/spellcasting'

const cleric = () => ({
  name: 'Cleric', pre: 'cleric', lvl: 5, type: 'prep', score: 18, abbr: 'Clr', dom: true, dcb: 1,
  base: [null, 3, 3, 2, 1], used: [0, 1], dused: [0, 0],
  sp: [[], [{ n: 'CLW', prep: 2, left: 1 }, { n: 'Bless', prep: 1, left: 1, dom: true }, { n: 'Shield', prep: 0, left: 0 }]],
})

describe('slots', () => {
  it('modifier and bonus slots', () => {
    expect(abilityModifier({ score: 18 })).toBe(4); expect(abilityModifier({})).toBe(0)
    expect(bonusSlots(4, 1)).toBe(1); expect(bonusSlots(4, 4)).toBe(1); expect(bonusSlots(4, 5)).toBe(0); expect(bonusSlots(9, 1)).toBe(3); expect(bonusSlots(9, 0)).toBe(0)
  })
  it('slotInfo: cantrips are at will, levels add bonus and a domain slot, missing levels are null', () => {
    const c = cleric()
    expect(slotInfo(c, 0)).toMatchObject({ atWill: true })
    expect(slotInfo(c, 1)).toMatchObject({ base: 3, bonus: 1, regular: 4, domain: 1, total: 5 })
    expect(slotInfo(c, 5)).toBeNull(); expect(slotInfo(null, 1)).toBeNull()
  })
  it('a class whose ability is too low cannot cast that level', () => {
    const c = cleric(); c.score = 12; c.base[3] = 2
    expect(slotInfo(c, 3)).toBeNull(); expect(slotInfo(c, 2)).not.toBeNull()
  })
  it('remaining counts spent slots, separately for domain', () => {
    const c = cleric()
    expect(regularRemaining(c, 1)).toBe(3); expect(domainRemaining(c, 1)).toBe(1); expect(remaining(c, 1)).toBe(4)
    c.dused[1] = 1; expect(remaining(c, 1)).toBe(3)
  })
  it('save DC adds class and spell bonuses', () => {
    expect(spellDC(cleric(), 2, { dcb: 2 })).toBe(10 + 2 + 4 + 1 + 2)
  })
})

describe('preparation and casting', () => {
  it('counts only normal copies and stops at the slot count', () => {
    const c = cleric()
    expect(preparedCount(c, 1)).toBe(2); expect(canPrepare(c, 1)).toBe(true)
    c.sp[1][2].prep = 2; expect(canPrepare(c, 1)).toBe(false)
    expect(canPrepare({ ...c, type: 'spont' }, 1)).toBe(false)
  })
  it('can cast needs a copy left (prepared) and a free slot; domain records never cast here', () => {
    const c = cleric()
    expect(canCast(c, 1, c.sp[1][0])).toBe(true); expect(canCast(c, 1, c.sp[1][2])).toBe(false); expect(canCast(c, 1, c.sp[1][1])).toBe(false)
    c.used[1] = 4; expect(canCast(c, 1, c.sp[1][0])).toBe(false)
    expect(canCast({ ...cleric(), type: 'spont' }, 1, { n: 'x', left: 0 })).toBe(true)
  })
  it('cast mode hides unprepared spells for prepared casters; prepare mode shows all', () => {
    const c = cleric()
    expect(visibleSpells(c, 1, false).map((s) => s.n)).toEqual(['CLW'])
    expect(visibleSpells(c, 1, true).map((s) => s.n)).toEqual(['CLW', 'Shield'])
  })
})

describe('known spells and catalog helpers', () => {
  it('known limit comes from the class table; unknown classes have none', () => {
    expect(knownMax({ pre: 'sorcerer', lvl: 5 }, 1)).toBe(4); expect(knownMax({ pre: 'nope' }, 1)).toBeNull()
    expect(knownCount(cleric(), 1)).toBe(2)
  })
  it('reads the level of a spell for a class from "Wiz 3, Clr 2"', () => {
    expect(spellLevelFor({ lv: 'Wiz 3, Clr 2' }, { abbr: 'Clr' })).toBe(2)
    expect(spellLevelFor({ lv: 'Sor 1, Wiz 1' }, { abbr: 'Clr' })).toBeNull()
    expect(spellLevelFor({ lv: 'Clr 4, Clr 2' }, { abbr: 'Wizard Wiz Clr' })).toBe(2)
    expect(classAliases({ abbr: 'Wizard Wiz' })).toEqual(['Wizard', 'Wiz'])
  })
  it('ensureClass fills missing arrays and fields without touching existing data', () => {
    const c = { sp: [[], [{ n: 'a', prep: 2 }]] }
    ensureClass(c)
    expect(c.base).toHaveLength(10); expect(c.used[9]).toBe(0); expect(c.sp[9]).toEqual([])
    expect(c.sp[1][0]).toMatchObject({ prep: 2, left: 2, dom: false, note: '', dcb: 0 })
  })
  it('newClassSpell stores a catalog row the way the class list keeps it', () => {
    expect(newClassSpell({ name: ' Fly ', school: 'Transmutation', descr: 'zoom', lv: 'Wiz 3' }))
      .toEqual({ n: 'Fly', s: 'Transmutation', d: 'zoom', lv: 'Wiz 3', note: '', prep: 0, left: 0, dom: false, dcb: 0 })
  })
})
