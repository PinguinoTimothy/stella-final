// Rules reference data, written as tables and short summaries (not the book's text).

/** Attacks of opportunity by action. aoo: 'yes' | 'no' | 'maybe' | 'usually' | 'varies'. note: footnote number from the book. */
export const AOO_GROUPS = [
  {
    group: 'Standard action',
    items: [
      ['Attack (melee)', 'no'],
      ['Attack (ranged)', 'yes'],
      ['Attack (unarmed)', 'yes'],
      ['Activate a magic item other than a potion or oil', 'no'],
      ['Aid another', 'maybe', 2],
      ['Cast a spell (1 standard action casting time)', 'yes'],
      ['Channel energy', 'no'],
      ['Concentration to maintain an active spell', 'no'],
      ['Dismiss a spell', 'no'],
      ['Draw a hidden weapon (see Sleight of Hand skill)', 'no'],
      ['Drink a potion or apply an oil', 'yes'],
      ['Escape a grapple', 'no'],
      ['Feint', 'no'],
      ['Light a torch with a tindertwig', 'yes'],
      ['Lower spell resistance', 'no'],
      ['Read a scroll', 'yes'],
      ['Ready (triggers a standard action)', 'no'],
      ['Stabilize a dying friend (see Heal skill)', 'yes'],
      ['Total defense', 'no'],
      ['Use extraordinary ability', 'no'],
      ['Use skill that takes 1 action', 'usually'],
      ['Use spell-like ability', 'yes'],
      ['Use supernatural ability', 'no'],
    ],
  },
  {
    group: 'Move action',
    items: [
      ['Move', 'yes'],
      ['Control a frightened mount', 'yes'],
      ['Direct or redirect an active spell', 'no'],
      ['Draw a weapon', 'no', 3],
      ['Load a hand crossbow or light crossbow', 'yes'],
      ['Open or close a door', 'no'],
      ['Mount/dismount a steed', 'no'],
      ['Move a heavy object', 'yes'],
      ['Pick up an item', 'yes'],
      ['Sheathe a weapon', 'yes'],
      ['Stand up from prone', 'yes'],
      ['Ready or drop a shield', 'no', 3],
      ['Retrieve a stored item', 'yes'],
    ],
  },
  {
    group: 'Full-round action',
    items: [
      ['Full attack', 'no'],
      ['Charge', 'no', 4],
      ['Deliver coup de grace', 'yes'],
      ['Escape from a net', 'yes'],
      ['Extinguish flames', 'no'],
      ['Light a torch', 'yes'],
      ['Load a heavy or repeating crossbow', 'yes'],
      ['Lock or unlock weapon in locked gauntlet', 'yes'],
      ['Prepare to throw splash weapon', 'yes'],
      ['Run', 'yes'],
      ['Use skill that takes 1 round', 'usually'],
      ['Use a touch spell on up to six friends', 'yes'],
      ['Withdraw', 'no', 4],
    ],
  },
  {
    group: 'Free action',
    items: [
      ['Cease concentration on a spell', 'no'],
      ['Drop an item', 'no'],
      ['Drop to the floor', 'no'],
      ['Prepare spell components to cast spell', 'no', 5],
      ['Speak', 'no'],
    ],
  },
  { group: 'Swift action', items: [['Cast a quickened spell', 'no']] },
  { group: 'Immediate action', items: [['Cast feather fall', 'no']] },
  {
    group: 'No action',
    items: [
      ['Delay', 'no'],
      ['5-foot step', 'no'],
    ],
  },
  {
    group: 'Action type varies',
    items: [
      ['Perform a combat maneuver', 'yes', 6],
      ['Use feat', 'varies', 7],
    ],
  },
];

export const AOO_LABEL = {
  yes: 'Provokes',
  no: 'Does not provoke',
  maybe: 'Maybe',
  usually: 'Usually',
  varies: 'Varies',
};

/**
 * Concentration check DC for a situation. `n` holds the inputs: spell level (L), damage, the spell's DC,
 * the grappler's CMB. Returns null for a situation whose DC depends on another spell.
 */
export const CONCENTRATION = [
  {
    id: 'defensive',
    label: 'Cast defensively',
    dc: n => 15 + 2 * n.level,
    note: '15 + double the spell level',
  },
  {
    id: 'injured',
    label: 'Injured while casting',
    dc: n => 10 + n.damage + n.level,
    note: '10 + damage dealt + spell level',
  },
  {
    id: 'continuous',
    label: 'Continuous damage while casting',
    dc: n => 10 + Math.floor(n.damage / 2) + n.level,
    note: '10 + half the damage (rounded down) + spell level',
  },
  {
    id: 'nondamaging',
    label: 'Affected by a non-damaging spell',
    dc: n => n.spellDc + n.level,
    note: "the affecting spell's DC + spell level",
  },
  {
    id: 'grappled',
    label: 'Grappled or pinned',
    dc: n => 10 + n.cmb + n.level,
    note: "10 + grappler's CMB + spell level",
  },
  {
    id: 'vigorous',
    label: 'Vigorous motion (wagon, galloping mount, rough boat)',
    dc: n => 10 + n.level,
    note: '10 + spell level',
  },
  {
    id: 'violent',
    label: 'Violent motion (gallop, rapids, storm at sea)',
    dc: n => 15 + n.level,
    note: '15 + spell level',
  },
  {
    id: 'extreme',
    label: 'Extremely violent motion (earthquake)',
    dc: n => 20 + n.level,
    note: '20 + spell level',
  },
  { id: 'rain', label: 'Wind with rain or sleet', dc: n => 5 + n.level, note: '5 + spell level' },
  {
    id: 'hail',
    label: 'Wind with hail, dust or debris',
    dc: n => 10 + n.level,
    note: '10 + spell level',
  },
  { id: 'spellweather', label: 'Weather caused by a spell', dc: () => null, note: 'see the spell' },
  {
    id: 'entangled',
    label: 'Entangled (net, tanglefoot bag)',
    dc: n => 15 + n.level,
    note: '15 + spell level',
  },
];

/** Which ability adds to the check, by class. */
export const CASTING_ABILITY = [
  ['Cleric, druid, ranger: Wisdom', 'Wis'],
  ['Bard, paladin, sorcerer: Charisma', 'Cha'],
  ['Wizard: Intelligence', 'Int'],
];

/** Notes of the attacks of opportunity table, as printed. */
export const AOO_NOTES = {
  1: 'Regardless of the action, if you move out of a threatened square, you usually provoke an attack of opportunity. This column indicates whether the action itself, not moving, provokes an attack of opportunity.',
  2: 'If you aid someone performing an action that would normally provoke an attack of opportunity, then the act of aiding another provokes an attack of opportunity as well.',
  3: 'If you have a base attack bonus of +1 or higher, you can combine one of these actions with a regular move. If you have the Two-Weapon Fighting feat, you can draw two light or one-handed weapons in the time it would normally take you to draw one.',
  4: 'May be taken as a standard action if you are limited to taking only a single action in a round.',
  5: 'Unless the component is an extremely large or awkward item.',
  6: 'Some combat maneuvers substitute for a melee attack, not an action. As melee attacks, they can be used once in an attack or charge action, one or more times in a full-attack action, or even as an attack of opportunity. Others are used as a separate action.',
  7: 'The description of a feat defines its effect.',
};
