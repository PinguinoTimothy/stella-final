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
    { tag: 'path', attrs: { d: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z' } },
    { tag: 'path', attrs: { d: 'M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z' } },
  ],
  db: [
    { tag: 'path', attrs: { d: 'M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z' } },
    { tag: 'path', attrs: { d: 'M5 17a3 3 0 0 1 3-3h10' } },
  ],
  items: [
    { tag: 'path', attrs: { d: 'M4 20L15 9' } },
    { tag: 'path', attrs: { d: 'M16 3l1.1 2.4L19.5 6.5l-2.4 1.1L16 10l-1.1-2.4L12.5 6.5l2.4-1.1z' } },
  ],
  setup: [
    { tag: 'path', attrs: { d: 'M4 7h9M17 7h3M4 17h3M11 17h9' } },
    { tag: 'circle', attrs: { cx: 15, cy: 7, r: 2 } },
    { tag: 'circle', attrs: { cx: 9, cy: 17, r: 2 } },
  ],
  more: [{ tag: 'path', attrs: { d: 'M5 12h.01M12 12h.01M19 12h.01' } }],
  party: [
    { tag: 'circle', attrs: { cx: 9, cy: 8, r: 3 } },
    { tag: 'path', attrs: { d: 'M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.5a3 3 0 0 1 0 5.5M18 14.5c2 .7 3 2.6 3 5.5' } },
  ],
};

ICON.more = '<path d="M5 12h.01M12 12h.01M19 12h.01"/>';
ICON.party =
  '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.5a3 3 0 0 1 0 5.5M18 14.5c2 .7 3 2.6 3 5.5"/>';

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
