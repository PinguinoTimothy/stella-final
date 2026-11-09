// Slayer calculator: attack, damage, skill and DC bonuses from a character's sheet numbers,
// plus the Slayer's own bonuses. Pure functions, no DOM, so they can be tested on their own.

/** Studied target bonus at a Slayer level: +1, going up by 1 at levels 5, 10, 15 and 20. */
export function studiedBonus(level) {
  return 1 + Math.floor(Math.max(0, level) / 5);
}

/** How many studied targets can be kept at once: one, plus one more at each of those levels. */
export function studiedTargetSlots(level) {
  return 1 + Math.floor(Math.max(0, level) / 5);
}

/** Sneak attack dice: none before level 3, then one more die every 3 levels. */
export function sneakDice(level) {
  return level >= 3 ? Math.floor(level / 3) : 0;
}

/** Reads "1d6+4", "1d8", "2d4-1". Returns null for anything else. */
export function parseDice(text) {
  const m = String(text ?? '')
    .replace(/\s+/g, '')
    .match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!m) return null;
  return { count: Number(m[1]), sides: Number(m[2]), flat: m[3] ? Number(m[3]) : 0 };
}

/** Reads a critical range such as "18-20x2" or "x3". Threshold is the lowest roll that threatens a critical. */
export function parseCrit(text) {
  const m = String(text ?? '').match(/^\s*(?:(\d+)\s*-\s*20)?\s*x\s*(\d+)\s*$/i);
  if (!m) return { threshold: 20, mult: 2 };
  return { threshold: m[1] ? Number(m[1]) : 20, mult: Number(m[2]) };
}

/** Average of a dice expression, or 0 if it cannot be read. */
export function diceAverage(dice) {
  if (!dice) return 0;
  return (dice.count * (dice.sides + 1)) / 2 + dice.flat;
}

/** Chance to hit an armour class with a total attack bonus. A natural 1 always misses and a natural 20 always hits. */
export function hitChance(attack, ac) {
  if (!Number.isFinite(ac)) return null;
  const needed = Math.min(20, Math.max(2, ac - attack));
  return (21 - needed) / 20;
}

/**
 * Bonuses from Legal Focused Target: each target given up adds +1 to one category, and no category can get two.
 * `focus` is { attack, damage, skill, dc } with 0 or 1 each. Only the first `reduced` picks count.
 */
export function focusBonus(focus, reduced) {
  const picked = { attack: 0, damage: 0, skill: 0, dc: 0 };
  let left = Math.max(0, reduced);
  for (const key of Object.keys(picked)) {
    if (left > 0 && focus?.[key]) {
      picked[key] = 1;
      left -= 1;
    }
  }
  return picked;
}

/**
 * Full picture for one weapon against one target.
 * weapon: { name, attack, damage, crit }   (attack is the total the sheet already shows)
 * opts:
 *   level          Slayer level
 *   studied        the target is the studied target
 *   undead         the target is undead
 *   seethingHatred the character has Seething Hatred (doubles the studied bonus on damage vs undead)
 *   lastwall       the character has the Lastwall Defender trait (+1 attack and damage vs undead)
 *   sneak          sneak attack applies (target denied its Dex bonus, or flanked)
 *   focus          Legal Focused Target picks { attack, damage, skill, dc }
 *   reduced        targets given up for Legal Focused Target
 *   ac             target armour class, optional
 */
export function calcWeapon(weapon, opts = {}) {
  const level = Number(opts.level) || 0;
  const studied = !!opts.studied;
  const undead = !!opts.undead;
  const focus = focusBonus(opts.focus, opts.reduced ?? 0);
  const studiedNow = studied ? studiedBonus(level) : 0;
  const lastwall = !!opts.lastwall && undead ? 1 : 0;
  const effects = opts.effects || [];

  // Each bonus is listed on its own, so the total can be checked by hand.
  const attackParts = [{ label: 'Sheet attack', value: weapon.attack || 0 }];
  if (studied) attackParts.push({ label: 'Studied target', value: studiedNow });
  if (studied && focus.attack) attackParts.push({ label: 'Legal Focused Target', value: focus.attack });
  if (lastwall) attackParts.push({ label: 'Lastwall Defender', value: lastwall });
  for (const e of activeEffects(effects, 'attack')) attackParts.push({ label: e.name, value: e.value });
  const attack = sumParts(attackParts);

  const dice = parseDice(weapon.damage);
  const diceAvg = diceAverage(dice);
  const damageParts = [];
  const damageStudied = studied ? studiedNow + focus.damage : 0;
  if (damageStudied) damageParts.push({ label: 'Studied target', value: damageStudied });
  const hatredDoubles = !!opts.seethingHatred && undead && studied;
  if (hatredDoubles && damageStudied) damageParts.push({ label: 'Seething Hatred (doubles studied bonus)', value: damageStudied });
  if (lastwall) damageParts.push({ label: 'Lastwall Defender', value: lastwall });
  for (const e of activeEffects(effects, 'damage')) damageParts.push({ label: e.name, value: e.value });
  const bonusFlat = sumParts(damageParts);

  const sneakCount = opts.sneak ? sneakDice(level) : 0;
  const sneakAvg = sneakCount * 3.5;

  const crit = parseCrit(weapon.crit);
  // Bonuses to damage rolls are multiplied on a critical. Sneak attack dice are not.
  const critAvg = (diceAvg + bonusFlat) * crit.mult + sneakAvg;

  // Target armour class: the value given, lowered or raised by any effects on the target.
  const acEffect = sumParts(activeEffects(effects, 'ac').map(e => ({ value: e.value })));
  const targetAc = Number.isFinite(opts.ac) ? opts.ac + acEffect : undefined;

  return {
    name: weapon.name,
    attack,
    attackParts,
    damage: {
      dice: weapon.damage || '',
      // The dice alone (1d8), and the flat bonus added to them: the sheet's own +N plus every bonus above.
      diceText: dice ? `${dice.count}d${dice.sides}` : weapon.damage || '',
      flat: (dice ? dice.flat : 0) + bonusFlat,
      average: diceAvg + bonusFlat + sneakAvg,
      diceAverage: diceAvg,
      parts: damageParts,
      sneakDice: sneakCount,
      sneakAverage: sneakAvg,
    },
    critical: { threshold: crit.threshold, mult: crit.mult, average: critAvg },
    hit: hitChance(attack, targetAc),
    targetAc,
  };
}

/** Effects that are switched on and apply to a kind (attack, damage, skill, dc, ac). */
export function activeEffects(effects, kind) {
  return (effects || []).filter(e => e && e.on !== false && e.kind === kind && Number.isFinite(Number(e.value)) && Number(e.value) !== 0)
    .map(e => ({ name: e.name || 'Effect', value: Number(e.value) }));
}

function sumParts(parts) {
  return parts.reduce((sum, p) => sum + (Number(p.value) || 0), 0);
}

/** Skill check bonus against the studied target. Only some skills count: Bluff, Knowledge, Perception, Sense Motive, Survival. */
export function skillBonus(base, opts = {}) {
  const level = Number(opts.level) || 0;
  const focus = focusBonus(opts.focus, opts.reduced ?? 0);
  const fromEffects = sumParts(activeEffects(opts.effects, 'skill'));
  return (base || 0) + (opts.studied ? studiedBonus(level) + focus.skill : 0) + fromEffects;
}

/** Bonus to the DC of the Slayer's abilities against the studied target. */
export function dcBonus(opts = {}) {
  const level = Number(opts.level) || 0;
  const focus = focusBonus(opts.focus, opts.reduced ?? 0);
  const fromEffects = sumParts(activeEffects(opts.effects, 'dc'));
  return (opts.studied ? studiedBonus(level) + focus.dc : 0) + fromEffects;
}
