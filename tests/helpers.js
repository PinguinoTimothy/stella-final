export const sampleState = () => ({
  name: 'Stella',
  cl: [{ id: 'c1', name: 'Cleric', pre: 'cleric', lvl: 5, type: 'prep', ab: 'wis', score: 18, cl: 5, abbr: 'Clr', dcb: 0, dom: true, all: true, domains: ['Sun'], dsel: [], sf: [], base: [null, 3, 3, 2, 1, null, null, null, null, null], used: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0], dused: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], customField: 'kept',
    sp: [[], [{ id: 's1', n: 'Cure Light Wounds', note: 'x', prep: 2, left: 1, dom: false, dcb: 0 }, { id: 's2', n: 'Bless', note: '', prep: 1, left: 1, dom: true, dcb: 1 }], [{ id: 's3', n: 'Hold Person', note: '', prep: 1, left: 1, dom: false, dcb: 0 }], [], [], [], [], [], [], []] }],
  items: [
    { id: 'i1', n: 'Wand of CLW', owner: 'Bob', k: 'Wand', qty: 1, equipped: false, slot: '', cur: 5, max: 50, daily: false, recovery: 'none', o: 'heals', spellName: 'Cure Light Wounds', cl: 1, spellLevel: 1, catalogId: '', price: 750, weight: 1, aura: 'faint', icl: 1, mystery: 'keep-me' },
    { id: 'i2', n: 'Ring of Protection +1', owner: 'Bob', k: 'Ring', qty: 1, equipped: true, slot: 'Ring', cur: 0, max: 0, o: '', price: 2000 },
    { id: 'i3', n: 'Potion of CLW', owner: 'Ann', k: 'Potion', qty: 3, o: '', price: 50 },
    { id: 'i4', n: 'Rope', owner: '', k: 'Other', qty: 1, o: '' },
  ],
  db: [{ id: 'c-1', n: 'My Spell', s: 'Evocation', lv: '1', d: 'custom' }],
  rate: { a: 1 }, fx: [{ id: 'fx1', n: 'Bless', k: 'buff', tg: 'Bob', targets: ['Bob'], rem: 10, tot: 10, cl: 5, note: 'SECRET' }],
  money: { pp: 0, gp: 120, sp: 0, cp: 5 }, log: [{ t: 1, k: 'item', m: 'x', d: '' }], cond: ['Fatigued'],
})
export const sampleParty = () => ['Bob', 'Ann']
