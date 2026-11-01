// Known indexes of the adventure maps. An index lists each map (section) with its rooms and where
// they sit on the page. Built once from the PDF text (see src/data/maps/*.json) and attached
// automatically when a PDF with the matching name and page count is imported.
import tyrantsPart1 from '../data/maps/tyrants-grasp-1-dead-roads.json'

const KNOWN = [
  { match: /dead[ _-]?roads/i, pages: 4, data: tyrantsPart1 },
]

/** Sections for a PDF with this name and page count, or null if there is no index for it. */
export function knownSectionsFor(name, pages) {
  const k = KNOWN.find((x) => x.match.test(name) && x.pages === pages)
  return k ? k.data.sections : null
}

/** Every room of an index as one flat list, each with the page it is on. Used by "All rooms". */
export function allRooms(sections = []) {
  return sections.flatMap((s) => s.rooms.map((r) => ({ ...r, page: s.page })))
}
