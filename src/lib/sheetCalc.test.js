// The scripts are the sheet's own formulas (the same shapes Pathfinder sheets use); the values are made up.
import { describe, expect, it } from 'vitest';
import { recalc, runCalc } from './sheetCalc';

const get = (values) => (name) => values[name];

describe('automatic fields of a character sheet', () => {
  it('sums named fields (AFSimple_Calculate SUM)', () => {
    const v = { A: '2', B: '3', C: '', D: '5' };
    expect(runCalc('AFSimple_Calculate("SUM", new Array ("A", "B", "C", "D"));', get(v))).toBe(10);
  });

  it('turns a score into its modifier, with the odd-number rounding', () => {
    const script = 'var statmod = this.getField("S").value;\r\nevent.value = ((statmod - (statmod % 2)) - 10) / 2;';
    expect(runCalc(script, get({ S: '16' }))).toBe(3);
    expect(runCalc(script, get({ S: '19' }))).toBe(4);
    expect(runCalc(script, get({ S: '9' }))).toBe(-1);
    expect(runCalc(script, get({ S: '10' }))).toBe(0);
  });

  it('takes the smaller of two values in if/else', () => {
    const script = 'a = getField("M").value;\nb = getField("D").value;\nif ( a < b ) { event.value = a } else { event.value = b }';
    expect(runCalc(script, get({ M: '5', D: '4' }))).toBe(4);
    expect(runCalc(script, get({ M: '3', D: '4' }))).toBe(3);
  });

  it('picks an ability with switch / case / break', () => {
    const script = 'switch (getField("O").value)\n{\ncase "STR":\n event.value = getField("Mod_STR").value;\n break;\ncase "DEX":\n event.value = getField("Mod_DEX").value;\n break;\n}';
    expect(runCalc(script, get({ O: 'DEX', Mod_STR: '3', Mod_DEX: '4' }))).toBe(4);
    expect(runCalc(script, get({ O: 'STR', Mod_STR: '3', Mod_DEX: '4' }))).toBe(3);
  });

  it('adds a trained bonus only when the box is ticked and there are ranks', () => {
    const script = 'a = getField("Class").value;\nb = getField("Ranks").value;\nif ( a == 1 && b > 0)\n { event.value = 3 }\nelse \n { event.value = "" };';
    expect(runCalc(script, get({ Class: '1', Ranks: '2' }))).toBe(3);
    expect(runCalc(script, get({ Class: '1', Ranks: '' }))).toBe('');
  });

  it('uses strict comparison', () => {
    const script = 'var s = getField("Stat").value;\nif (s !== "" && s === "STR") { event.value = 1 } else { event.value = 0 }';
    expect(runCalc(script, get({ Stat: 'STR' }))).toBe(1);
    expect(runCalc(script, get({ Stat: '' }))).toBe(0);
  });

  it('reads numbers that were typed as text', () => {
    expect(runCalc('event.value = getField("A").value + getField("B").value;', get({ A: '1', B: '2' }))).toBe(3);
  });

  it('understands numbers with no leading digit and simple formulas', () => {
    expect(runCalc('/** BVCALC x*.02 EVCALC **/event.value=AFMakeNumber(getField("G").value)*.02', get({ G: '151' }))).toBeCloseTo(3.02, 10);
    expect(runCalc('event.value = Math.floor(getField("S").value/3);', get({ S: '7' }))).toBe(2);
  });

  it('can set another field', () => {
    const written = {};
    runCalc('getField("Check").value = "Yes";\nevent.value = 1;', get({}), (n, v) => (written[n] = v));
    expect(written).toEqual({ Check: 'Yes' });
  });

  it('refuses anything it does not know, instead of running it', () => {
    expect(() => runCalc('alert("x");', get({}))).toThrow();
    expect(() => runCalc('eval("1")', get({}))).toThrow();
  });

  it('recalculates chains: a total feeds a modifier, which feeds another field', () => {
    const calcs = {
      Total: 'AFSimple_Calculate("SUM", new Array ("Base", "Misc"));',
      Mod: 'var statmod = this.getField("Total").value;\nevent.value = ((statmod - (statmod % 2)) - 10) / 2;',
      Double: 'event.value = getField("Mod").value * 2;',
    };
    const changed = recalc({ Base: '16', Misc: '2', Total: '', Mod: '', Double: '' }, calcs);
    expect(changed).toEqual({ Total: '18', Mod: '4', Double: '8' });
  });

  it('stores results with at most six decimals, as the sheet does', () => {
    const changed = recalc({ W: '230' }, { Load: 'event.value = AFMakeNumber(getField("W").value) / 3;' });
    expect(changed.Load).toBe('76.666667');
  });
});
