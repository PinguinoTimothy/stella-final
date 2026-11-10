// Attack options for a character: the standard attack, the full attack, and the feat options that change them.
// Pure functions, no DOM, so they can be tested without a sheet.
/** Iterative attacks from a base attack bonus: +6 gives [6, 1], +11 gives [11, 6, 1]. */
export function baseAttackBonuses(bab) {
  const base = Number(bab) || 0;
  const out = [];
  for (let b = base; b > 0; b -= 5) out.push(b);
  if (!out.length) out.push(base);
  return out;
}

/**
 * Deadly Aim at a base attack bonus. Each step costs −1 on ranged attack rolls and gives +2 on ranged damage.
 * A new step starts at BAB +4 and every +4 after that: +1 to +3 gives one step, +4 to +7 gives two, and so on.
 */
export function deadlyAimStep(bab) {
  const penalty = 1 + Math.floor(Math.max(0, Number(bab) || 0) / 4);
  return { penalty, bonus: penalty * 2 };
}

/**
 * The attack options open to a character. Each one lists the attacks it makes, with the total
 * bonus of each (base bonus + modifiers + extras), and how many arrows each attack fires.
 *
 * Three options for a ranged weapon, one for a melee weapon:
 *   normal  Ataque normal: a standard action, one attack at the highest bonus, one arrow.
 *   full    Ataque completo: every iterative attack. With Manyshot the first attack fires two arrows.
 *   rapid   Ataque completo con disparo rápido: full attack plus one extra attack at the highest bonus, all at −2.
 *
 * opts:
 *   bab         base attack bonus
 *   mod         attack modifier (ability mod, enhancement, misc), added to every attack
 *   ranged      the weapon is a ranged weapon
 *   rapidShot   the character has Rapid Shot (ranged only)
 *   manyShot    the character has Manyshot (needs BAB +6 here; the other prerequisites are not checked)
 *   pointBlank  Point Blank Shot: +1 attack with a ranged weapon within 30 ft (its +1 damage is added elsewhere)
 *   deadlyAim   Deadly Aim is on: −penalty on every ranged attack roll (its damage bonus is added elsewhere, see deadlyAimStep)
 *
 * Rules used here (Pathfinder 1e):
 *   Rapid Shot  only on a full attack; one extra attack at the highest bonus; every attack this round takes −2.
 *   Manyshot    only on a full attack with a bow; the first attack fires two arrows. Rapid Shot's −2 applies to the list when both are taken.
 */
export function attackModes(opts = {}) {
  const bab = Number(opts.bab) || 0;
  const ranged = !!opts.ranged;
  const pointBlank = !!opts.pointBlank && ranged;
  const deadly = !!opts.deadlyAim && ranged ? deadlyAimStep(bab).penalty : 0;
  const mod = (Number(opts.mod) || 0) + (pointBlank ? 1 : 0) - deadly;
  const base = baseAttackBonuses(bab).map(b => b + mod);
  const manyShot = ranged && !!opts.manyShot && bab >= 6;
  const rapid = ranged && !!opts.rapidShot;
  const modes = [];

  modes.push({
    id: 'normal',
    label: 'Ataque normal',
    attacks: [{ bonus: base[0], arrows: 1 }],
    note: 'Acción estándar: un solo ataque con el bonificador más alto.',
  });

  modes.push({
    id: 'full',
    label: 'Ataque completo',
    attacks: base.map((bonus, i) => ({ bonus, arrows: manyShot && i === 0 ? 2 : 1 })),
    note: manyShot
      ? 'Incluye Disparo múltiple: el primer ataque dispara dos flechas. Ambas aciertan a la vez; el daño de precisión y el crítico se aplican una sola vez por ataque, el resto de bonos a cada flecha.'
      : '',
  });

  if (rapid) {
    const list = [base[0], ...base].map(b => b - 2);
    modes.push({
      id: 'rapid',
      label: 'Ataque completo con disparo rápido',
      attacks: list.map((bonus, i) => ({ bonus, arrows: manyShot && i === 0 ? 2 : 1 })),
      note: manyShot
        ? 'Un ataque extra al bonificador más alto; todos los ataques de la ronda sufren −2. El primer ataque dispara dos flechas (Disparo múltiple).'
        : 'Un ataque extra al bonificador más alto; todos los ataques de la ronda sufren −2.',
    });
  }

  return modes;
}
