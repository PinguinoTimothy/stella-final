// Item glyphs, categories and body slots. Extracted from the single-file version.
export const IGLYPH = {
  Weapon: [
    { tag: 'path', attrs: { d: 'M14.5 5.5L19 4l-1.5 4.5L9 17l-2-2z' } },
    { tag: 'path', attrs: { d: 'M6 14l4 4' } },
    { tag: 'path', attrs: { d: 'M8 16l-3.5 3.5' } },
  ],
  Armor: [{ tag: 'path', attrs: { d: 'M8 4l-5 3 2 4 3-1v10h8V10l3 1 2-4-5-3c-.5 1.5-2 2.5-4 2.5S8.5 5.5 8 4z' } }],
  Shield: [{ tag: 'path', attrs: { d: 'M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z' } }],
  Ring: [
    { tag: 'circle', attrs: { cx: 12, cy: 15, r: 5.5 } },
    { tag: 'path', attrs: { d: 'M9.5 6.5L12 3l2.5 3.5L12 9z' } },
  ],
  'Wondrous item': [
    { tag: 'path', attrs: { d: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z' } },
    { tag: 'path', attrs: { d: 'M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z' } },
  ],
  Rod: [
    { tag: 'path', attrs: { d: 'M5 19L19 5' } },
    { tag: 'path', attrs: { d: 'M3.5 17.5l3 3M17.5 3.5l3 3' } },
  ],
  'Metamagic rod': [
    { tag: 'path', attrs: { d: 'M5 19L19 5' } },
    { tag: 'path', attrs: { d: 'M3.5 17.5l3 3M17.5 3.5l3 3' } },
    { tag: 'circle', attrs: { cx: 12, cy: 12, r: 2.2 } },
  ],
  Staff: [
    { tag: 'path', attrs: { d: 'M6 21L15 12' } },
    { tag: 'path', attrs: { d: 'M15.5 4.5l4 4-3.5 3.5-4-4z' } },
  ],
  Wand: [
    { tag: 'path', attrs: { d: 'M4 20L15 9' } },
    { tag: 'path', attrs: { d: 'M16 3l1.1 2.4L19.5 6.5l-2.4 1.1L16 10l-1.1-2.4L12.5 6.5l2.4-1.1z' } },
  ],
  Scroll: [
    { tag: 'rect', attrs: { x: 6, y: 4, width: 12, height: 16, rx: 2 } },
    { tag: 'path', attrs: { d: 'M9 9h6M9 13h6' } },
  ],
  Potion: [
    { tag: 'path', attrs: { d: 'M10 3h4M11 3v5l-5 9a3 3 0 0 0 2.6 4.5h6.8A3 3 0 0 0 18 17l-5-9V3' } },
    { tag: 'path', attrs: { d: 'M8.5 14h7' } },
  ],
  _: [
    { tag: 'path', attrs: { d: 'M6 8h12l1 12H5z' } },
    { tag: 'path', attrs: { d: 'M9 8V6a3 3 0 0 1 6 0v2' } },
  ],
};

export const ICAT = {
  Weapon: 'gear',
  Armor: 'gear',
  Shield: 'gear',
  Ring: 'worn',
  'Wondrous item': 'worn',
  Wand: 'charged',
  Staff: 'charged',
  Rod: 'charged',
  'Metamagic rod': 'charged',
  Scroll: 'use',
  Potion: 'use',
};
export const ICATS = [
  ['gear', 'Armas y armaduras'],
  ['worn', 'Objetos magicos'],
  ['charged', 'Varitas, bastones & varas'],
  ['use', 'Pergaminos y pociones'],
  ['other', 'Otros'],
];
export const SLOT_ORDER = [
  'Head',
  'Headband',
  'Eyes',
  'Shoulders',
  'Neck',
  'Chest',
  'Body',
  'Armor',
  'Belt',
  'Wrists',
  'Hands',
  'Feet',
  'Ring',
  'Main hand',
  'Off hand',
  'Slotless',
];
export const SLOT_FREE = [
  'Head',
  'Headband',
  'Eyes',
  'Shoulders',
  'Neck',
  'Chest',
  'Body',
  'Belt',
  'Wrists',
  'Hands',
  'Feet',
  'Ring',
];
export const SLOT_MAX = { Ring: 2, Slotless: 99 };
export const SLOT_DEFAULT = {
  Ring: 'Ring',
  Armor: 'Armor',
  Shield: 'Off hand',
  Weapon: 'Main hand',
};

// Bottom-nav icons
export const ICON = {
  fx: [
    { tag: 'path', attrs: { d: 'M7 3h10M7 21h10' } },
    { tag: 'path', attrs: { d: 'M8 3v3a4 4 0 0 0 1.5 3L12 12l-2.5 3A4 4 0 0 0 8 18v3' } },
    { tag: 'path', attrs: { d: 'M16 3v3a4 4 0 0 1-1.5 3L12 12l2.5 3A4 4 0 0 1 16 18v3' } },
  ],
  cast: [
    { tag: 'path', attrs: { d: 'M2 12c2.7-4.6 6-7 10-7s7.3 2.4 10 7c-2.7 4.6-6 7-10 7S4.7 16.6 2 12z' } },
    { tag: 'circle', attrs: { cx: 12, cy: 12, r: 3.2 } },
  ],
  db: [
    { tag: 'path', attrs: { d: 'M4 5.5C6 4.5 8.5 4.5 12 6.5c3.5-2 6-2 8-1v13c-2-1-4.5-1-8 1-3.5-2-6-2-8-1z' } },
    { tag: 'path', attrs: { d: 'M12 6.5v13' } },
    { tag: 'path', attrs: { d: 'M12 10l.8 1.6 1.7.2-1.2 1.2.3 1.7L12 13.9l-1.6.8.3-1.7-1.2-1.2 1.7-.2z' } },
  ],
  items: [
    { tag: 'path', attrs: { d: 'M9.5 3h5M10.5 3v4.5L6.6 14.3A5 5 0 0 0 11 21.5h2a5 5 0 0 0 4.4-7.2l-3.9-6.8V3' } },
    { tag: 'path', attrs: { d: 'M7.8 15.5h8.4' } },
  ],
  setup: [
    { tag: 'circle', attrs: { cx: 12, cy: 12, r: 9 } },
    { tag: 'circle', attrs: { cx: 12, cy: 12, r: 3 } },
    { tag: 'path', attrs: { d: 'M12 3v3M12 18v3M3 12h3M18 12h3' } },
    { tag: 'path', attrs: { d: 'M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1' } },
  ],
  more: [
    { tag: 'path', attrs: { d: 'M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z' } },
  ],
  party: [
    { tag: 'path', attrs: { d: 'M5 20.5V11a7 7 0 0 1 14 0v9.5' } },
    { tag: 'path', attrs: { d: 'M3 20.5h18' } },
    { tag: 'path', attrs: { d: 'M9 12.5a3 3 0 0 0 6 0' } },
    { tag: 'path', attrs: { d: 'M12 4v2' } },
  ],
};

export const KINDS = [
  'Wand',
  'Staff',
  'Rod',
  'Metamagic rod',
  'Scroll',
  'Potion',
  'Ring',
  'Wondrous item',
  'Weapon',
  'Armor',
  'Shield',
  'Other',
];
export const CHARGED_KINDS = ['Wand', 'Staff', 'Rod', 'Metamagic rod'];
export const SPELL_KINDS = ['Wand', 'Staff', 'Scroll', 'Potion'];
export const EQUIPPABLE = ['Weapon', 'Armor', 'Shield', 'Ring', 'Wondrous item', 'Other'];
