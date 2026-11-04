import { describe, expect, it } from 'vitest';
import { combatSummary, isMythicMonster } from './monsters';

describe('isMythicMonster', () => {
  it('recognises the mythic subtype case-insensitively', () => {
    expect(isMythicMonster({ subtypes: ['Mythic'], MR: 0 })).toBe(true);
  });

  it('recognises a positive mythic rank when the subtype is absent', () => {
    expect(isMythicMonster({ MR: 2 })).toBe(true);
  });

  it('accepts a string subtype from older or alternate data', () => {
    expect(isMythicMonster({ subtypes: 'mythic' })).toBe(true);
  });

  it('does not classify ordinary monsters as mythic', () => {
    expect(isMythicMonster({ subtypes: ['augmented'], MR: 0 })).toBe(false);
    expect(isMythicMonster({})).toBe(false);
  });
});

describe('combatSummary mythic metadata', () => {
  it('keeps both names, mythic rank and individual feat flags', () => {
    const card = combatSummary({
      title1: 'Worg',
      title2: 'Mythic Worg',
      subtypes: ['mythic'],
      MR: 1,
      feats: [{ name: 'Run' }, { name: 'Skill Focus (Perception)', is_mythic: true }],
    });

    expect(card.name).toBe('Worg');
    expect(card.displayName).toBe('Mythic Worg');
    expect(card.isMythic).toBe(true);
    expect(card.mythicRank).toBe(1);
    expect(card.feats).toEqual([
      { name: 'Run', isMythic: false },
      { name: 'Skill Focus (Perception)', isMythic: true },
    ]);
  });
});
