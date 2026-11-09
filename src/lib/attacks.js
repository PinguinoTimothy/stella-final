// Attack sequences for a character: the normal full attack, and the feat options that change it.
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
 * The attack modes open to a character. Each mode lists the attacks it makes, with the total
 * bonus of each (base bonus + modifiers + extras), and how many arrows or shots each attack fires.
 *
 * opts:
 *   bab         base attack bonus
 *   mod         attack modifier (ability mod, enhancement, misc), added to every attack
 *   ranged      the weapon is a ranged weapon
 *   rapidShot   the character has Rapid Shot (ranged only)
 *   manyShot    the character has Manyshot (needs BAB +6 here; the other prerequisites are not checked)
 *   pointBlank  Point Blank Shot: +1 attack with a ranged weapon within 30 ft (its +1 damage is added elsewhere)
 *
 * Rules used here (Pathfinder 1e):
 *   Rapid Shot  one extra attack at the highest bonus; every attack this round takes -2.
 *   Manyshot    on a full attack with a bow, the first attack fires two arrows. Rapid Shot's -2 applies only if it is taken too.
 */
export function attackModes(opts = {}) {
  const bab = Number(opts.bab) || 0;
  const pointBlank = !!opts.pointBlank && !!opts.ranged;
  const mod = (Number(opts.mod) || 0) + (pointBlank ? 1 : 0);
  const base = baseAttackBonuses(bab).map(b => b + mod);
  const modes = [];

  modes.push({
    id: 'full',
    label: 'Ataque completo',
    attacks: base.map(bonus => ({ bonus, arrows: 1 })),
    note: '',
  });

  if (opts.ranged && opts.rapidShot) {
    const top = base[0];
    const extra = [top, ...base].map(b => ({ bonus: b - 2, arrows: 1 }));
    modes.push({
      id: 'rapid',
      label: 'Disparo rápido',
      attacks: extra,
      note: 'Un ataque extra al bonificador más alto; todos los ataques de la ronda sufren −2.',
    });
  }

  // Manyshot: on a full attack with a bow, the first attack fires two arrows.
  // Rapid Shot is not needed for the benefit. If the character also has Rapid Shot, its extra
  // attack and −2 are added first, so the two-arrow attack is the first of those.
  if (opts.ranged && opts.manyShot && bab >= 6) {
    const list = opts.rapidShot ? [base[0], ...base].map(b => b - 2) : base;
    modes.push({
      id: 'many',
      label: opts.rapidShot ? 'Disparo múltiple con disparo rápido' : 'Disparo múltiple',
      attacks: list.map((bonus, i) => ({ bonus, arrows: i === 0 ? 2 : 1 })),
      note: 'Con arco: el primer ataque dispara dos flechas. Ambas flechas aciertan a la vez; el daño de precisión y el crítico se aplican una sola vez por ataque, el resto de bonos a cada flecha.',
    });
  }

  return modes;
}
