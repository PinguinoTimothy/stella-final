// An adventure is one book PDF and its map PDF. They are paired by the name of the file:
// "Tyrant_s_Grasp_-_1_The_Dead_Roads_-_Maps_-_Paizo….pdf" and "Tyrant_s_Grasp_-_1_The_Dead_Roads_-_Paizo….pdf"
// both become "Tyrant s Grasp - 1 The Dead Roads".

/** The adventure name from a file name: everything before the publisher and part markers. */
export function adventureName(fileName) {
  return String(fileName || '')
    .replace(/\.pdf$/i, '')
    .replace(/[-_]*\s*(maps?|paizo|pfrpg|compressed|removed|interactive)\b.*$/i, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*$/, '')
    .trim();
}

/** A key that is the same for the book and the map of one adventure. */
export function adventureKey(fileName) {
  return adventureName(fileName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}
