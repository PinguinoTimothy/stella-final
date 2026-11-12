import { describe, expect, it } from 'vitest';
import { fillPdf, groupOf, readFields } from './sheet';

import { makeSheet } from '../../tests/sheetFixture';

const sample = async () => new Uint8Array(await makeSheet());
const byName = (fields, n) => fields.find(f => f.name === n);

describe('character sheet PDF', () => {
  it('reads the fields of the sheet, with their current values', async () => {
    const { pageCount, fields } = await readFields(await sample());
    expect(pageCount).toBe(3);
    expect(fields.length).toBeGreaterThan(5);
    expect(byName(fields, 'Character_Name').value).toBe('Hood Robinson');
    expect(byName(fields, 'Ability_DEX_Total').value).toBe('19');
    expect(byName(fields, 'Skill_Acrobatics_Ranks').value).toBe('3');
    expect(byName(fields, 'Character_Name').group).toBe('Character');
  });

  it('offers checkboxes and dropdowns with the right kind', async () => {
    const { fields } = await readFields(await sample());
    expect(fields.some(f => f.kind === 'check')).toBe(true);
    const select = fields.find(f => f.kind === 'select');
    expect(select.options).toEqual(['STR', 'DEX']);
  });

  it('writes values into the PDF and reads them back', async () => {
    const out = await fillPdf(await sample(), { Character_Name: 'Hood R.', Ability_STR_Total: '18' });
    const { fields } = await readFields(out);
    expect(byName(fields, 'Character_Name').value).toBe('Hood R.');
    expect(byName(fields, 'Ability_STR_Total').value).toBe('18');
    expect(byName(fields, 'Character_Race').value).toBe('Human');
  });

  it('writes every field of the store without failing, even the ones with a 0 maximum length', async () => {
    const { fields } = await readFields(await sample());
    const values = Object.fromEntries(fields.filter(f => f.kind === 'text').map(f => [f.name, f.name === 'CR_HP_Total' ? '40' : f.value]));
    const out = await fillPdf(await sample(), { ...values, CR_HP_Total: '41' });
    const back = await readFields(out);
    expect(byName(back.fields, 'CR_HP_Total').value).toBe('41');
  }, 60000);

  it('ignores names that are not in the sheet', async () => {
    const out = await fillPdf(await sample(), { Nope_Field: 'x' });
    const { fields } = await readFields(out);
    expect(byName(fields, 'Nope_Field')).toBeUndefined();
  });

  it('groups fields for the editor', () => {
    expect(groupOf('Skill_Acrobatics_Ranks')).toBe('Skills');
    expect(groupOf('Weapon_Attack_1')).toBe('Weapons');
    expect(groupOf('Something_Else')).toBe('Other');
  });
});
