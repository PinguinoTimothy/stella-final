// Tips the guide (the penguin) shows for each screen. Keys are the tab names used in app.ui.tab.
// Short, practical, one idea each. Edit freely; a screen without an entry gets the default tips.
export const GUIDE_TIPS = {
  cast: [
    'Pick a spell and a caster level to see how it works.',
    'Spells you cast can be added to Active effects so you remember to end them.',
  ],
  fx: [
    'Active effects are what is running on each character right now.',
    'Type a spell name in Nuevo hechizo and its duration is filled in for you.',
  ],
  db: [
    'Search all the spells by name, school or description.',
  ],
  items: [
    'Tap + to add an item. Wands get 50 charges and a price from their spell.',
    'Tap an item name to see its details. Use the owner tabs to filter by character.',
    'Groups fold open and shut. Your choice is remembered on this device.',
  ],
  more: [
    'Monsters, skills, conditions and both catalogs are in More.',
  ],
  magicCatalog: [
    'Use the filters to narrow down magic items. Open one to see its details and add it to the inventory.',
  ],
  equipmentCatalog: [
    'Equipment comes with price and weight. Sort by price with the menu above the list.',
  ],
  monsters: [
    'Tap a monster to read its stat block.',
    'Adding a monster to combat is done from a larger screen.',
  ],
  party: [
    'Party shows each character at a glance.',
  ],
  default: [
    'Tap me any time to see a tip for this screen.',
  ],
}

export function tipsFor(tab) {
  return GUIDE_TIPS[tab] || GUIDE_TIPS.default
}
