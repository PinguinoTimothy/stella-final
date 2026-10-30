import { describe, expect, it } from 'vitest'
import { buildRows, buildState, diff, fullChanges, snapOf } from '../src/lib/mapping'
import { sampleParty, sampleState } from './helpers'

// "pretend the database": rows by table -> arrays, like the REST API returns them
const toTables = (R) => Object.fromEntries(Object.entries(R).map(([t, o]) => [t, Object.values(o)]))

describe('mapping', () => {
  it('state -> tables -> state loses nothing (including unknown fields)', () => {
    const S = sampleState(), party = sampleParty()
    const back = buildState(toTables(buildRows(S, party)))
    expect(back.party).toEqual(party)
    expect(back.s.name).toBe('Stella')
    expect(back.s.money).toEqual({ pp: 0, gp: 120, sp: 0, cp: 5 })
    expect(back.s.cond).toEqual(['Fatigued'])
    expect(back.s.items[0].mystery).toBe('keep-me')
    expect(back.s.items.map((i) => i.n)).toEqual(S.items.map((i) => i.n))
    expect(back.s.cl[0].customField).toBe('kept')
    expect(back.s.cl[0].sp[1].map((x) => x.n)).toEqual(['Cure Light Wounds', 'Bless'])
    expect(back.s.cl[0].base).toEqual(S.cl[0].base)
    expect(back.mig).toBe(false)
  })

  it('diff only reports what changed, including deletions', () => {
    const S = sampleState(), party = sampleParty()
    const snap = snapOf(buildRows(S, party))
    expect(diff(buildRows(S, party), snap).n).toBe(0)
    S.items[2].qty = 2
    S.items.splice(3, 1)
    const d = diff(buildRows(S, party), snap)
    expect(d.changes.items.up.map((r) => r.id)).toEqual(['i3'])
    expect(d.changes.items.del).toEqual(['i4'])
    expect(d.n).toBe(2)
  })

  it('gives ids to records that have none, and fixes duplicates', () => {
    const S = sampleState(); delete S.items[0].id; S.items[1].id = 'dup'; S.items[2].id = 'dup'
    const R = buildRows(S, sampleParty())
    expect(Object.keys(R.items)).toHaveLength(4)
  })

  it('full upload covers every table', () => {
    expect(Object.keys(fullChanges(buildRows(sampleState(), sampleParty())))).toContain('class_spells')
  })
})
