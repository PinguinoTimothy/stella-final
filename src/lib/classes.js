
// Pathfinder spellcasting class tables, ported from the original index.html.

function parseTable(source) {
  return source.split('|').map((row) =>
    row.trim().split(/\s+/).map((value) => value === '-' ? null : Number(value))
  )
}

const FULL = parseTable(
  '3 1|4 2|4 2 1|4 3 2|4 3 2 1|4 3 3 2|4 4 3 2 1|4 4 3 3 2|4 4 4 3 2 1|4 4 4 3 3 2|4 4 4 4 3 2 1|4 4 4 4 3 3 2|4 4 4 4 4 3 2 1|4 4 4 4 4 3 3 2|4 4 4 4 4 4 3 2 1|4 4 4 4 4 4 3 3 2|4 4 4 4 4 4 4 3 2 1|4 4 4 4 4 4 4 3 3 2|4 4 4 4 4 4 4 4 3 3|4 4 4 4 4 4 4 4 4 4'
)

const SORCERER = parseTable(
  '3|4|5|6 3|6 4|6 5 3|6 6 4|6 6 5 3|6 6 6 4|6 6 6 5 3|6 6 6 6 4|6 6 6 6 5 3|6 6 6 6 6 4|6 6 6 6 6 5 3|6 6 6 6 6 6 4|6 6 6 6 6 6 5 3|6 6 6 6 6 6 6 4|6 6 6 6 6 6 6 5 3|6 6 6 6 6 6 6 6 4|6 6 6 6 6 6 6 6 6'
)

const SORCERER_KNOWN = parseTable(
  '4 2|5 2|5 3|6 3 1|6 4 2|7 4 2 1|7 5 3 2|8 5 3 2 1|8 5 4 3 2|9 5 4 3 2 1|9 5 5 4 3 2|9 5 5 4 3 2 1|9 5 5 4 4 3 2|9 5 5 4 4 3 2 1|9 5 5 4 4 4 3 2|9 5 5 4 4 4 3 2 1|9 5 5 4 4 4 3 3 2|9 5 5 4 4 4 3 3 2 1|9 5 5 4 4 4 3 3 3 2|9 5 5 4 4 4 3 3 3 3'
)

const BARD = parseTable(
  '1|2|3|3 1|4 2|4 3|4 3 1|4 4 2|5 4 3|5 4 3 1|5 4 4 2|5 5 4 3|5 5 4 3 1|5 5 4 4 2|5 5 5 4 3|5 5 5 4 3 1|5 5 5 4 4 2|5 5 5 5 4 3|5 5 5 5 5 4|5 5 5 5 5 5'
)

const BARD_KNOWN = parseTable(
  '4 2|5 3|6 4|6 4 2|6 4 3|6 4 3|6 5 4 2|6 5 4 3|6 5 4 3|6 5 5 4 2|6 6 5 4 3|6 6 5 4 3|6 6 5 5 4 2|6 6 6 5 4 3|6 6 6 5 4 3|6 6 6 5 5 4 2|6 6 6 6 5 4 3|6 6 6 6 5 4 3|6 6 6 6 5 5 4|6 6 6 6 6 5 5'
)

const MAGUS = parseTable(
  '3 1|4 2|4 3|4 3 1|4 4 2|5 4 3|5 4 3 1|5 4 4 2|5 5 4 3|5 5 4 3 1|5 5 4 4 2|5 5 5 4 3|5 5 5 4 3 1|5 5 5 4 4 2|5 5 5 5 4 3|5 5 5 5 4 3 1|5 5 5 5 4 4 2|5 5 5 5 5 4 3|5 5 5 5 5 5 4|5 5 5 5 5 5 5'
)

const PALADIN = parseTable(
  '-|-|-|0|1|1|1 0|1 1|2 1|2 1 0|2 1 1|2 2 1|3 2 1 0|3 2 1 1|3 2 2 1|3 3 2 1|4 3 2 1|4 3 2 2|4 3 3 2|4 4 3 3'
)

export const CLASS_TABLES = {
  wizard: {
    n: 'Wizard', t: 'prep', ab: 'int', abbr: 'Wizard Wiz',
    offset: 0, table: FULL,
  },
  cleric: {
    n: 'Cleric', t: 'prep', ab: 'wis', abbr: 'Cleric Clr',
    offset: 0, table: FULL, dom: true, all: true,
  },
  druid: {
    n: 'Druid', t: 'prep', ab: 'wis', abbr: 'Druid Drd',
    offset: 0, table: FULL, all: true,
  },
  sorcerer: {
    n: 'Sorcerer', t: 'spont', ab: 'cha', abbr: 'Sorcerer Sor',
    offset: 1, table: SORCERER, known: SORCERER_KNOWN,
  },
oracle: {
  n: 'Oracle', t: 'spont', ab: 'cha', abbr: 'Oracle Orc',
  offset: 1, table: SORCERER, known: SORCERER_KNOWN,
},
  bard: {
    n: 'Bard', t: 'spont', ab: 'cha', abbr: 'Bard Brd',
    offset: 1, table: BARD, known: BARD_KNOWN,
  },
  magus: {
    n: 'Magus', t: 'prep', ab: 'int', abbr: 'Magus Mag',
    offset: 0, table: MAGUS,
  },
  warpriest: {
    n: 'Warpriest', t: 'prep', ab: 'wis', abbr: 'Warpriest Wpr',
    offset: 0, table: MAGUS, all: true,
  },
  paladin: {
    n: 'Paladin', t: 'prep', ab: 'cha', abbr: 'Paladin Pal',
    offset: 1, table: PALADIN, casterOffset: 3, all: true,
  },
  ranger: {
    n: 'Ranger', t: 'prep', ab: 'wis', abbr: 'Ranger Rgr',
    offset: 1, table: PALADIN, casterOffset: 3, all: true,
  },
  antipaladin: {
    n: 'Antipaladin', t: 'prep', ab: 'cha', abbr: 'Antipaladin Apal',
    offset: 1, table: PALADIN, casterOffset: 3, all: true,
  },
}

export function newCasterClass(name = 'Class') {
  return {
    name,
    pre: '',
    lvl: 1,
    type: 'prep',
    ab: 'wis',
    score: 10,
    cl: 1,
    abbr: '',
    dcb: 0,
    dom: false,
    all: false,
    domains: [],
    dsel: [],
    sf: [],
    base: Array(10).fill(null),
    used: Array(10).fill(0),
    dused: Array(10).fill(0),
    sp: Array.from({ length: 10 }, () => []),
  }
}

export function applyClassTable(c) {
  const preset = CLASS_TABLES[c.pre]
  if (!preset) return

  const level = Math.min(20, Math.max(1, Number(c.lvl) || 1))
  c.lvl = level

  const row = preset.table[level - 1] || []

  for (let spellLevel = 0; spellLevel < 10; spellLevel++) {
    const column = spellLevel - preset.offset
    c.base[spellLevel] =
      column >= 0 && column < row.length ? row[column] ?? null : null
  }

  c.cl = Math.max(0, level - (preset.casterOffset || 0))
}

export function applyClassPreset(c, key) {
  const oldPreset = CLASS_TABLES[c.pre]
  const preset = CLASS_TABLES[key]

  c.pre = preset ? key : ''
  if (!preset) return

  if (
    !c.name ||
    /^Class \d+$/.test(c.name) ||
    (oldPreset && c.name === oldPreset.n)
  ) {
    c.name = preset.n
  }

  c.type = preset.t
  c.ab = preset.ab
  c.abbr = preset.abbr
  c.dom = !!preset.dom
  c.all = !!preset.all
  c.lvl = Math.min(20, Math.max(1, Number(c.lvl) || 1))

  applyClassTable(c)
}

export function classModifier(c) {
  return Math.floor(((Number(c?.score) || 10) - 10) / 2)
}

export function classLevel(c) {
  return Math.min(20, Math.max(1, Number(c?.lvl) || 1))
}