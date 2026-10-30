// Skills reference: pure helpers. The data lives in skillsData.js.
import { SKILLS } from './skillsData'
export { SKILLS }

/** Tags shown on the right of a skill header: ability, "trained only", "armor check penalty". */
export function skillTags(s) {
  const tags = [s[1]]
  if (s[2].includes('T')) tags.push('trained only')
  if (s[2].includes('A')) tags.push('armor check penalty')
  return tags
}

/** Splits a section's lines into rows. "label: 15 · other: 20" gives two rows with the number in its own column. */
export function skItems(sec) {
  const out = []
  sec[1].forEach((line) => {
    const parts = line.split(' · '), multi = parts.length > 1
    parts.forEach((p) => {
      let label = '', val = '', m = p.match(/^(.+?):\s+(.+)$/)
      if (m) { label = m[1]; val = m[2] }
      else if (multi && (m = p.match(/^(.+?)\s+([+–\-]?\d+)$/))) { label = m[1]; val = m[2] }
      const vm = val && val.match(/^([+–\-]?\d+(?:[–-]\d+)?%?)\s*([^(]*?)\s*(\([^)]*(?:\([^)]*\))?[^)]*\))?$/)
      if (vm && (vm[1] + vm[2]).length <= 22) out.push({ v: vm[1], x: vm[2].replace(/^,\s*/, ''), l: label, n: vm[3] ? vm[3].slice(1, -1) : '', q: p.toLowerCase() })
      else out.push({ t: p, q: p.toLowerCase() })
    })
  })
  return out
}

/** Sections of skill `s` that match `q` (by skill name, section title or row text), or null. */
export function skHit(s, q) {
  const byName = s[0].toLowerCase().includes(q), r = []
  s[3].forEach((sec) => {
    let it = skItems(sec)
    if (!byName) it = it.filter((x) => (sec[0].toLowerCase() + ' ' + x.q).includes(q))
    if (it.length) r.push([sec[0], it])
  })
  return r.length ? r : null
}

/** Skills ready to render. With a query, only matches (all open); without, every skill with all its sections. */
export function filterSkills(query) {
  const q = String(query || '').toLowerCase().trim(), out = []
  SKILLS.forEach((s) => {
    const sections = q ? skHit(s, q) : s[3].map((sec) => [sec[0], skItems(sec)])
    if (sections) out.push({ name: s[0], tags: skillTags(s), sections })
  })
  return out
}
