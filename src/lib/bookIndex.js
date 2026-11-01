// Reads an adventure book (the text PDF) and builds one record per room: its encounter text, its
// creatures (from the stat blocks) and the rooms it points to. Works on the text layer with pdf.js.
// Two columns per page, the sidebar and the page furniture are left out.

const SIDEBAR_X = 0.84        // right of this is the book index (Part 1…, NPC Gallery…)
const COLUMN_X = 0.47         // left column is left of this, right column starts at about 0.49
const ROOM_HEAD = /^([A-F])(\d{1,2})\.\s+(.+?)(?:\s*\(CR\s*([\d/]+)\))?$/
const AREA_HEAD = /^([A-F])\.\s+([A-Z][A-Z’'\- ]+)$/
const STAT_NAME_CR = /^([A-Z][A-Z’'\- ]{2,}?)\s+CR\s+([\d/]+)$/
const STAT_NAME = /^([A-Z][A-Z’'\- ]{2,})$/
const CR_LINE = /^CR\s+([\d/]+)$/
const XP_LINE = /^XP\s+([\d,]+)/
const HP_LINE = /^hp\s+(\d+)\s*(?:\((.*)\))?/
const LABEL_WORDS = 'Hazard|Development|Treasure|Creature|Tactics|Trap|Special'
const AREA_REF = /\barea\s+([A-F]\d{1,2})\b/g

/** Text items of one page, as { s, x, y } with x and y as fractions of the page (top-left origin). */
async function pageItems(page) {
  const [x0, y0, x1, y1] = page.view
  const w = x1 - x0, h = y1 - y0
  const c = await page.getTextContent()
  return c.items
    .filter((i) => i.str && i.str.trim())
    .map((i) => ({ s: i.str.trim(), x: (i.transform[4] - x0) / w, y: (y1 - i.transform[5]) / h }))
    .filter((i) => i.x <= SIDEBAR_X && i.y > 0.04 && i.y < 0.96)
}

/** Lines of one column, top to bottom. Items on the same height become one line. */
function columnLines(items) {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x)
  const lines = []
  for (const it of sorted) {
    const last = lines[lines.length - 1]
    if (last && Math.abs(last.y - it.y) < 0.004) last.s += ' ' + it.s
    else lines.push({ y: it.y, s: it.s })
  }
  return lines.map((l) => ({ ...l, s: l.s.replace(/\s+/g, ' ').trim() }))
}

/** The text of a whole book, in reading order: page by page, left column then right column. */
export async function readBook(doc, onProgress) {
  const lines = []
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n)
    const items = await pageItems(page)
    const left = items.filter((i) => i.x < COLUMN_X)
    const right = items.filter((i) => i.x >= COLUMN_X)
    for (const l of [...columnLines(left), ...columnLines(right)]) lines.push({ ...l, page: n })
    onProgress?.(n, doc.numPages)
  }
  return lines
}

/** Splits the text into rooms and areas, and reads the stat blocks inside them. */
export function parseRooms(lines) {
  const rooms = []
  const areas = []
  const warnings = []
  let current = null
  let area = null

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    const next = lines[i + 1]

    const a = l.s.match(AREA_HEAD)
    if (a) { area = { letter: a[1], title: `${a[1]}. ${a[2].trim()}`, page: l.page }; areas.push(area); continue }

    const r = l.s.match(ROOM_HEAD)
    if (r) {
      const code = r[1] + r[2]
      // a title can run on to the next line ("A1. Red Shrikes" / "Sarcophagi")
      let title = r[3].trim()
      const cont = next && next.page === l.page && Math.abs(next.y - l.y) < 0.03 && /^[A-Z][a-z]/.test(next.s) && next.s.length < 40 && !/[.:]$/.test(next.s)
      if (cont && !r[4]) { title += ' ' + next.s; i++ }
      current = { code, letter: r[1], title, cr: r[4] || null, area: area?.letter || r[1], page: l.page, text: [], creatures: [], refs: new Set() }
      rooms.push(current)
      continue
    }

    if (!current) continue

    // stat block: "OSTOVITE CR 1" on one line, or the name and "CR 1" on two
    let name = null, cr = null, used = 0
    const sn = l.s.match(STAT_NAME_CR)
    if (sn) { name = sn[1]; cr = sn[2] }
    else if (STAT_NAME.test(l.s) && next && CR_LINE.test(next.s)) { name = l.s; cr = next.s.match(CR_LINE)[1]; used = 1 }
    if (name) {
      const xp = lines[i + 1 + used]?.s.match(XP_LINE)
      const hp = lines[i + 2 + used]?.s.match(HP_LINE)
      current.creatures.push({ name: toTitle(name), cr, xp: xp ? Number(xp[1].replace(/,/g, '')) : null, hp: hp ? Number(hp[1]) : null, bestiary: hp?.[2] || null })
      i += 2 + used
      continue
    }

    for (const m of l.s.matchAll(AREA_REF)) current.refs.add(m[1])
    current.text.push(l.s)
  }

  const out = rooms.map((r) => ({ ...r, refs: [...r.refs], text: splitLabels(r.text.join(' ')) }))
  for (const r of out) {
    if (!r.creatures.length && /Creature:/.test(r.text.creature || '')) warnings.push(`${r.code}: mentions a creature without a stat block`)
  }
  return { rooms: out, areas, warnings }
}

/** "Hazard: …  Treasure: …" → { intro, hazard, treasure, … }. */
function splitLabels(text) {
  const out = { intro: '' }
  const parts = text.split(new RegExp(`(?=\\b(?:${LABEL_WORDS}):)`))
  for (const p of parts) {
    const m = p.match(/^(\w+):\s*([\s\S]*)$/)
    if (m) out[m[1].toLowerCase()] = m[2].trim()
    else out.intro = (out.intro + ' ' + p).trim()
  }
  return out
}

const toTitle = (s) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
