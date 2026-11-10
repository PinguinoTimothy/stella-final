// Turns the values of a character sheet's fillable fields into the data the calculator uses.
// Pure: it takes a { fieldName: value } map, so it can be tested without reading a PDF.

const ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
const MAX_CLASSES = 6;
const MAX_WEAPONS = 12;

const text = v => String(v ?? '').trim();

/** "+5", "-1", "16" → number. Anything unreadable is 0. */
export function num(v) {
  const n = parseInt(text(v).replace(/[^\d-]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Reads a sheet attack line such as "+9/+1", "+10(x2)/+8/+5" or "16".
 * Each number is one attack bonus; "(xN)" repeats it N times. Returns [] if there is nothing readable.
 */
export function parseAttackList(v) {
  const out = [];
  const re = /([+-]?\d+)(?:\s*\(\s*x\s*(\d+)\s*\))?/gi;
  for (const m of text(v).matchAll(re)) {
    const bonus = parseInt(m[1], 10);
    const times = m[2] ? Math.max(1, parseInt(m[2], 10)) : 1;
    for (let k = 0; k < times; k++) out.push(bonus);
  }
  return out;
}

export function readSheet(f) {
  const classes = [];
  for (let i = 1; i <= MAX_CLASSES; i++) {
    const name = text(f[`CR_Class_Name_${i}`]);
    if (name) classes.push({ name, level: num(f[`CR_Levels_${i}`]) || 1 });
  }
  const slayer = classes.find(c => /slayer/i.test(c.name));

  const abilities = {};
  for (const a of ABILITIES) {
    abilities[a] = { total: num(f[`Ability_${a}_Total`]), mod: num(f[`Ability_${a}_Mod`]) };
  }

  const weapons = [];
  for (let i = 1; i <= MAX_WEAPONS; i++) {
    const name = text(f[`Weapon_Name_${i}`]);
    if (!name) continue;
    weapons.push({
      name,
      attacks: parseAttackList(f[`Weapon_Attack_${i}`]),
      attack: parseAttackList(f[`Weapon_Attack_${i}`])[0] ?? 0,
      damage: text(f[`Weapon_Damage_${i}`]),
      crit: text(f[`Weapon_Critical_${i}`]),
      range: text(f[`Weapon_Range_${i}`]),
      type: text(f[`Weapon_Type_${i}`]),
    });
  }

  const notes = Object.keys(f)
    .filter(k => /^FeatFeatures_\d+$/.test(k))
    .sort()
    .map(k => text(f[k]))
    .filter(Boolean);
  const hasNote = word => notes.some(n => n.toLowerCase().includes(word));

  return {
    name: text(f.Character_Name),
    race: text(f.Character_Race),
    player: text(f.Character_Player),
    classes,
    level: classes.reduce((sum, c) => sum + c.level, 0),
    slayerLevel: slayer ? slayer.level : 0,
    bab: num(f.CR_BAB_Total),
    ac: num(f.AD_AC_Total),
    hp: num(f.CR_HP_Total),
    abilities,
    weapons,
    notes,
    // Feats and traits the calculator knows about, found in the sheet's notes.
    hasSeethingHatred: hasNote('seething hatred'),
    hasLastwall: hasNote('lastwall'),
    hasLegalFocusedTarget: hasNote('legal focused target') || hasNote('focused target'),
    hasRapidShot: hasNote('rapid shot'),
    hasManyShot: hasNote('many shot') || hasNote('manyshot'),
    hasPointBlank: hasNote('point blank') || hasNote('pointblank'),
    hasDeadlyAim: hasNote('deadly aim'),
    skills: readSkills(f),
  };
}

/** Total of each skill that has a value on the sheet, by the sheet's own names. */
function readSkills(f) {
  const skills = {};
  for (const k of Object.keys(f)) {
    const m = k.match(/^Skill_(.+)_Total$/);
    if (m && f[k] !== undefined && f[k] !== '') skills[m[1].replace(/_/g, ' ')] = num(f[k]);
  }
  return skills;
}
