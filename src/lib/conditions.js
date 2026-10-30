// Condition reminders (Pathfinder 1e). Text from the original single-file app (var CONDS).
// Pure data and search, no Vue: easy to test (see tests/conditions.test.js).

export const CONDITIONS = [
  {
    "name": "Bleed",
    "text": "Take the listed damage at the start of each turn. Stopped by a DC 15 Heal check or any spell that cures hit point damage. Bleeds of the same damage type don't stack (take the worse)."
  },
  {
    "name": "Blinded",
    "text": "–2 AC, no Dex bonus to AC, –4 on most Str and Dex skill checks and opposed Perception. Sight-based checks fail. Attackers have total concealment (50% miss). DC 10 Acrobatics to move faster than half speed, or fall prone."
  },
  {
    "name": "Broken",
    "text": "Item condition. Weapon: –2 attack and damage, crits only on a natural 20 and for ×2. Armor or shield: AC bonus halved, armor check penalty doubled. Tool: –2 on checks. Wand or staff: uses twice the charges. Worth 75% of its value."
  },
  {
    "name": "Confused",
    "text": "Can't tell allies from foes. Each turn roll d%: 01–25 act normally, 26–50 babble, 51–75 hit self for 1d8 + Str, 76–100 attack the nearest creature."
  },
  {
    "name": "Cowering",
    "text": "Frozen in fear: no actions, –2 AC, no Dex bonus to AC."
  },
  {
    "name": "Dazed",
    "text": "No actions, but no AC penalty. Usually lasts 1 round."
  },
  {
    "name": "Dazzled",
    "text": "–1 on attack rolls and sight-based Perception checks."
  },
  {
    "name": "Dead",
    "text": "Hit points at negative Con score, Con 0, or killed outright. Only magic can restore life."
  },
  {
    "name": "Deafened",
    "text": "–4 on initiative, sound-based Perception fails, –4 on opposed Perception, 20% spell failure on spells with verbal components."
  },
  {
    "name": "Disabled",
    "text": "At 0 hp (or stable and conscious at negative hp). One move or standard action per round, half speed. A strenuous standard action deals 1 damage afterward."
  },
  {
    "name": "Dying",
    "text": "Unconscious, negative hp, no actions. Each turn make a DC 10 Con check (minus negative hp) to stabilize. Failing loses 1 hp. Dies at negative hp equal to Con."
  },
  {
    "name": "Energy Drained",
    "text": "One or more negative levels, possibly permanent. Dies if negative levels equal or exceed Hit Dice."
  },
  {
    "name": "Entangled",
    "text": "Half speed, can't run or charge, –2 on attack rolls, –4 Dex. Casting needs a concentration check (DC 15 + spell level)."
  },
  {
    "name": "Exhausted",
    "text": "Half speed, can't run or charge, –6 Str and Dex. After 1 hour of complete rest it becomes fatigued."
  },
  {
    "name": "Fascinated",
    "text": "Entranced: only pays attention to the effect. –4 on reaction skill checks. A threat allows a new save; an obvious threat breaks it. An ally can shake it free (standard action)."
  },
  {
    "name": "Fatigued",
    "text": "Can't run or charge, –2 Str and Dex. Becomes exhausted if fatigued again. Gone after 8 hours of complete rest."
  },
  {
    "name": "Flat-Footed",
    "text": "Hasn't acted yet this combat: loses Dex bonus to AC and can't make attacks of opportunity."
  },
  {
    "name": "Frightened",
    "text": "Must flee from the source if able (fights if it can't). –2 on attack rolls, saves, skill checks and ability checks."
  },
  {
    "name": "Grappled",
    "text": "Can't move, –4 Dex, –2 on attack rolls and combat maneuvers (except to grapple or escape), no two-handed actions, no attacks of opportunity. Casting needs a concentration check (DC 10 + grappler's CMB + spell level)."
  },
  {
    "name": "Helpless",
    "text": "Paralyzed, bound, asleep or unconscious. Dex counts as 0 (–5). Melee attacks get +4. Coup de grace: automatic hit and critical, Fort save (DC 10 + damage) or die."
  },
  {
    "name": "Incorporeal",
    "text": "No physical body. Immune to nonmagical attacks, takes half damage from magic, full damage from force effects and other incorporeal creatures."
  },
  {
    "name": "Invisible",
    "text": "+2 on attack rolls against sighted opponents, who lose their Dex bonus to AC."
  },
  {
    "name": "Nauseated",
    "text": "Can't attack, cast, concentrate or do anything demanding attention. Only a single move action per turn."
  },
  {
    "name": "Panicked",
    "text": "Drops what it holds and flees at top speed along a random path. No other actions. –2 on saves, skill checks and ability checks. Cowers if cornered."
  },
  {
    "name": "Paralyzed",
    "text": "Frozen: Str and Dex 0 and helpless, but can take purely mental actions. Flying creatures fall. Each square it occupies costs 2 squares to move through."
  },
  {
    "name": "Petrified",
    "text": "Turned to stone and treated as unconscious. Damage to the statue stays when it returns to flesh."
  },
  {
    "name": "Pinned",
    "text": "Can't move, no Dex bonus, an extra –4 AC. Only verbal and mental actions, no somatic or material spells. Concentration check (DC 10 + grappler's CMB + spell level). Doesn't stack with grappled."
  },
  {
    "name": "Prone",
    "text": "–4 on melee attacks and no ranged weapons (except crossbows). +4 AC against ranged, –4 AC against melee. Standing up is a move action that provokes an attack of opportunity."
  },
  {
    "name": "Shaken",
    "text": "–2 on attack rolls, saves, skill checks and ability checks."
  },
  {
    "name": "Sickened",
    "text": "–2 on attack rolls, weapon damage, saves, skill checks and ability checks."
  },
  {
    "name": "Stable",
    "text": "No longer losing hp but still unconscious at negative hp. Each hour a DC 10 Con check (minus negative hp) to wake up as disabled."
  },
  {
    "name": "Staggered",
    "text": "One move or standard action per round, no full-round actions. Also happens when nonlethal damage equals current hp."
  },
  {
    "name": "Stunned",
    "text": "Drops everything held, no actions, –2 AC, no Dex bonus to AC."
  },
  {
    "name": "Unconscious",
    "text": "Knocked out and helpless. Caused by negative hp (above –Con) or nonlethal damage over current hp."
  }
]

/** Conditions matching `query` (name or text). Active ones come first, then alphabetical. */
export function filterConditions(query, active = []) {
  const q = String(query || '').toLowerCase().trim()
  const on = new Set(active)
  return CONDITIONS
    .filter(c => !q || `${c.name} ${c.text}`.toLowerCase().includes(q))
    .sort((a, b) => Number(on.has(b.name)) - Number(on.has(a.name)) || a.name.localeCompare(b.name))
}