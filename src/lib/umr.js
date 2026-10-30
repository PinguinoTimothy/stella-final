// Universal monster rules: pure helpers. The data lives in umrData.js.
import { UMR, UMRC } from './umrData'
export { UMR, UMRC }

/** Rules filtered by group (`cat`, '' = all) and text query, sorted by name. */
export function filterUmr(query, cat) {
  const q = String(query || '').toLowerCase().trim()
  return UMR
    .filter((r) => (!cat || r[2] === cat) && (!q || (r[0] + ' ' + r[1] + ' ' + r[3]).toLowerCase().includes(q)))
    .sort((a, b) => a[0].localeCompare(b[0]))
}

/** A rule is open when tapped, or automatically when a search leaves 5 or fewer. */
export const umrIsOpen = (name, opened, query, count) => opened === name || (!!String(query || '').trim() && count <= 5)
