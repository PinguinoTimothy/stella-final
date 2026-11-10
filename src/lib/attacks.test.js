import { describe, expect, it } from 'vitest';
import { attackModes, baseAttackBonuses, deadlyAimStep } from './attacks';

const bonuses = mode => mode.attacks.map(a => a.bonus);
const arrows = mode => mode.attacks.map(a => a.arrows);
const ids = modes => modes.map(m => m.id);
const byId = (modes, id) => modes.find(m => m.id === id);

describe('baseAttackBonuses', () => {
  it('lists iterative attacks every 5', () => {
    expect(baseAttackBonuses(6)).toEqual([6, 1]);
    expect(baseAttackBonuses(11)).toEqual([11, 6, 1]);
  });
});

describe('attack options, melee or without feats', () => {
  it('a melee weapon gets normal and full attack only', () => {
    const modes = attackModes({ bab: 11, ranged: false, rapidShot: true, manyShot: true });
    expect(ids(modes)).toEqual(['normal', 'full']);
  });

  it('normal attack is one attack at the highest bonus, one arrow', () => {
    const modes = attackModes({ bab: 11, ranged: true });
    const normal = byId(modes, 'normal');
    expect(bonuses(normal)).toEqual([11]);
    expect(arrows(normal)).toEqual([1]);
  });

  it('full attack is every iterative attack, one arrow each without Manyshot', () => {
    const modes = attackModes({ bab: 11, ranged: true });
    const full = byId(modes, 'full');
    expect(bonuses(full)).toEqual([11, 6, 1]);
    expect(arrows(full)).toEqual([1, 1, 1]);
  });
});

describe('Manyshot (base for this character)', () => {
  it('the standard attack stays one arrow', () => {
    const modes = attackModes({ bab: 11, ranged: true, manyShot: true });
    expect(arrows(byId(modes, 'normal'))).toEqual([1]);
  });

  it('the full attack fires two arrows on the first attack', () => {
    const modes = attackModes({ bab: 11, ranged: true, manyShot: true });
    const full = byId(modes, 'full');
    expect(bonuses(full)).toEqual([11, 6, 1]);
    expect(arrows(full)).toEqual([2, 1, 1]);
  });

  it('needs BAB +6', () => {
    const modes = attackModes({ bab: 5, ranged: true, manyShot: true });
    expect(arrows(byId(modes, 'full'))).toEqual([1]);
  });

  it('does not apply to melee', () => {
    const modes = attackModes({ bab: 11, ranged: false, manyShot: true });
    expect(arrows(byId(modes, 'full'))).toEqual([1, 1, 1]);
  });
});

describe('Rapid Shot', () => {
  it('adds the full attack with rapid shot: extra attack at the top, all at −2', () => {
    const modes = attackModes({ bab: 11, ranged: true, rapidShot: true });
    expect(ids(modes)).toEqual(['normal', 'full', 'rapid']);
    const rapid = byId(modes, 'rapid');
    expect(bonuses(rapid)).toEqual([9, 9, 4, -1]);
    expect(arrows(rapid)).toEqual([1, 1, 1, 1]);
  });

  it('the standard attack does not get Rapid Shot', () => {
    const modes = attackModes({ bab: 11, ranged: true, rapidShot: true });
    expect(bonuses(byId(modes, 'normal'))).toEqual([11]);
  });

  it('with Manyshot too: the first attack of the rapid line fires two arrows', () => {
    const modes = attackModes({ bab: 11, ranged: true, rapidShot: true, manyShot: true });
    const rapid = byId(modes, 'rapid');
    expect(bonuses(rapid)).toEqual([9, 9, 4, -1]);
    expect(arrows(rapid)).toEqual([2, 1, 1, 1]);
    expect(arrows(byId(modes, 'full'))).toEqual([2, 1, 1]);
  });

  it('does not apply to melee', () => {
    const modes = attackModes({ bab: 11, ranged: false, rapidShot: true });
    expect(ids(modes)).not.toContain('rapid');
  });
});

describe('Deadly Aim steps', () => {
  it('−1 / +2 at BAB +1 to +3', () => {
    expect(deadlyAimStep(1)).toEqual({ penalty: 1, bonus: 2 });
    expect(deadlyAimStep(3)).toEqual({ penalty: 1, bonus: 2 });
  });

  it('−2 / +4 at BAB +4, −3 / +6 at BAB +8', () => {
    expect(deadlyAimStep(4)).toEqual({ penalty: 2, bonus: 4 });
    expect(deadlyAimStep(7)).toEqual({ penalty: 2, bonus: 4 });
    expect(deadlyAimStep(8)).toEqual({ penalty: 3, bonus: 6 });
  });
});

describe('Deadly Aim on attack rolls', () => {
  it('takes the penalty off every ranged attack', () => {
    const modes = attackModes({ bab: 11, ranged: true, rapidShot: true, deadlyAim: true });
    expect(bonuses(byId(modes, 'normal'))).toEqual([8]);
    expect(bonuses(byId(modes, 'full'))).toEqual([8, 3, -2]);
    expect(bonuses(byId(modes, 'rapid'))).toEqual([6, 6, 1, -4]);
  });

  it('does nothing to melee', () => {
    const modes = attackModes({ bab: 11, ranged: false, deadlyAim: true });
    expect(bonuses(byId(modes, 'normal'))).toEqual([11]);
  });

  it('stacks with Point Blank Shot: +1 and the penalty together', () => {
    const modes = attackModes({ bab: 11, ranged: true, pointBlank: true, deadlyAim: true });
    expect(bonuses(byId(modes, 'normal'))).toEqual([9]);
  });
});
