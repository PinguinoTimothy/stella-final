// Reads an adventure book (the text PDF) and builds one record per room, in reading order:
// the read-aloud boxes (kept line by line, as printed), the descriptive text, the labelled parts
// (Hazard, Treasure, Development) and the creatures from the stat blocks.
// Two columns per page; the sidebar and the page furniture are left out.

const SIDEBAR_X = 0.84        // right of this is the book index (Part 1…, NPC Gallery…)
const COLUMN_X = 0.47         // left column is left of this, right column starts at about 0.49
const READ_ALOUD_FONT = 'Dax-Regular'   // the green boxes; stat blocks use the same font, see below
const HEADING_FONTS = /TradeGothic|CaslonAntique|Dax-Bold/

const ROOM_HEAD = /^([A-F])(\d{1,2})\.\s+(.+?)(?:\s*\(CR\s*([\d/]+)\))?$/
const AREA_HEAD = /^([A-F])\.\s+([A-Z][A-Z’'\- ]+)$/
const STAT_NAME_CR = /^([A-Z][A-Z’'\- ]{2,}?)\s+CR\s+([\d/]+)$/
const STAT_NAME = /^([A-Z][A-Z’'\- ]{2,})$/
const CR_LINE = /^CR\s+([\d/]+)$/
const XP_LINE = /^XP\s+([\d,]+)/
const HP_LINE = /^hp\s+(\d+)\s*(?:\((.*)\))?/
const LABEL = /^(Hazard|Development|Treasure|Creature|Tactics|Trap|Special)\b:?/
const AREA_REF = /\barea\s+([A-F]\d{1,2})\b/g

/** Text lines of one page with the real font of each line. Sidebar and page furniture are dropped. */
async function pageLines(page, pageNo) {
  const [x0, y0, x1, y1] = page.view
  const w = x1 - x0, h = y1 - y0
  await page.getOperatorList()          // loads the fonts so their real names are known
  const c = await page.getTextContent()
  const items = c.items
    .filter((i) => i.str && i.str.trim())
    .map((i) => ({
      s: i.str.trim(),
      w: i.width,
      x: (i.transform[4] - x0) / w,
      y: (y1 - i.transform[5]) / h,
      font: (page.commonObjs.get(i.fontName)?.name || '').replace(/^[A-Z]{6}\+/, ''),
    }))
    .filter((i) => i.x <= SIDEBAR_X && i.y > 0.04 && i.y < 0.96)
  const left = [], right = []
  const rows = []
  for (const it of [...items].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const row = rows.find((r) => Math.abs(r.y - it.y) < 0.004)
    if (row) row.items.push(it); else rows.push({ y: it.y, items: [it] })
  }
  for (const row of rows) {
    let leftEnd = null
    for (const it of row.items) {
      const end = leftEnd
      const continuesLeft = it.x >= COLUMN_X && end !== null && it.x - end < 0.04 && it.s.length <= 6
      if (it.x < COLUMN_X || continuesLeft) { left.push(it); leftEnd = it.x + (it.w || 0) / w }
      else right.push(it)
    }
  }
  return [...columnLines(left).map((l) => ({ ...l, col: 'L' })), ...columnLines(right).map((l) => ({ ...l, col: 'R' }))].map((l) => ({ ...l, page: pageNo }))
}

/** Lines of one column, top to bottom. Items at the same height become one line; the line takes the font of its longest item. */
function columnLines(items) {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x)
  const lines = []
  for (const it of sorted) {
    const last = lines[lines.length - 1]
    if (last && Math.abs(last.y - it.y) < 0.004) {
      last.s += ' ' + it.s
      if (it.s.length > last.fontLen) { last.font = it.font; last.fontLen = it.s.length }
    } else {
      lines.push({ y: it.y, s: it.s, font: it.font, fontLen: it.s.length })
    }
  }
  return lines.map((l) => ({ y: l.y, font: l.font, s: l.s.replace(/\s+/g, ' ').trim() }))
}

/** All the lines of the book in reading order: page by page, left column then right column. */
export async function readBook(doc, onProgress) {
  const lines = []
  for (let n = 1; n <= doc.numPages; n++) {
    lines.push(...(await pageLines(await doc.getPage(n), n)))
    onProgress?.(n, doc.numPages)
  }
  return lines
}

/** A line that is clearly shorter than the usual line of its block ends a paragraph. */
function reflow(lines, firstContinues = false) {
  const clean = lines.map((x) => x.trim()).filter(Boolean)
  if (!clean.length) return []
  const sorted = clean.map((x) => x.length).sort((a, b) => a - b)
  const typical = sorted[Math.floor(sorted.length * 0.9)] || sorted[sorted.length - 1]
  const paragraphs = []
  let cur = ''
  clean.forEach((line, i) => {
    const shortPrev = i > 0 && !(firstContinues && i === 1) && clean[i - 1].length < 0.7 * typical
    if (!cur) cur = line
    else if (shortPrev) { paragraphs.push(cur); cur = line }
    else cur = cur.endsWith('-') ? cur + line : cur + ' ' + line
  })
  if (cur) paragraphs.push(cur)
  return paragraphs
}

/** Groups the room's parts into blocks: read-aloud boxes, text, and labelled parts ("Hazard: …"). */
function toBlocks(parts) {
  const groups = []
  for (const p of parts) {
    const last = groups[groups.length - 1]
    if (last && last.type === p.type) last.lines.push(p.s)
    else groups.push({ type: p.type, lines: [p.s] })
  }
  const out = []
  let pendingTitle = ''
  for (const g of groups) {
    if (g.type === 'aloud') { out.push({ type: 'aloud', paragraphs: reflow(g.lines) }); continue }
    if (g.type === 'note-title') { pendingTitle = g.lines.join(' '); continue }
    if (g.type === 'note') {
      out.push({ type: 'note', title: pendingTitle, paragraphs: reflow(g.lines) })
      pendingTitle = ''
      continue
    }
    let label = null
    let plain = []
    const flush = () => { if (plain.length) { out.push({ type: 'text', paragraphs: reflow(plain) }); plain = [] } }
    for (const s of g.lines) {
      const m = s.match(LABEL)
      if (m) {
        flush()
        label = { type: 'label', label: m[1], lines: [s.replace(LABEL, '').trim()] }
        out.push(label)
      } else if (label) {
        label.lines.push(s)
      } else {
        plain.push(s)
      }
    }
    flush()
  }
  return out.map((b) => (b.type === 'label' ? { type: 'label', label: b.label, paragraphs: reflow(b.lines, true) } : b))
}

/**
 * Stat blocks written inline in the text ("OSTOVITE XP 400 hp 11 (Pathfinder RPG Bestiary 5 187)")
 * become creatures and leave the text. Returns the blocks without them.
 */
const STAT_INLINE = /\b([A-Z][A-Z’'\- ]{2,}?)\s+(?:CR\s+([\d/]+)\s+)?XP\s+([\d,]+)\s+hp\s+(\d+)\s*(?:\(\s*([^)]*)\))?/g
function extractStats(blocks, creatures) {
  const out = []
  for (const b of blocks) {
    if (b.type === 'aloud') { out.push(b); continue }
    const paragraphs = b.paragraphs
      .map((para) => para.replace(STAT_INLINE, (_, name, cr, xp, hp, bestiary) => {
        const n = toTitle(name.trim())
        if (!creatures.some((c) => c.name === n)) {
          creatures.push({ name: n, cr: cr || null, xp: Number(xp.replace(/,/g, '')), hp: Number(hp), bestiary: bestiary || null })
        }
        return ''
      }).replace(/\s{2,}/g, ' ').trim())
      .filter(Boolean)
    if (paragraphs.length) out.push({ ...b, paragraphs })
  }
  return out
}

/** Splits the book into rooms and areas, reads the stat blocks inside them and classifies the text. */
/**
 * Corrections for lines the rules get wrong. Each one is { page, index, kind }, where index is the
 * line's position on its page and kind is 'aloud', 'note', 'text' or 'skip'. They come from the AI pass.
 */
export function parseRooms(lines, overrides = []) {
  const forced = new Map(overrides.map((o) => [`${o.page}:${o.index}`, o.kind]))
  const pageIndex = new Map()
  lines = lines.map((l) => {
    const k = (pageIndex.get(l.page) || 0)
    pageIndex.set(l.page, k + 1)
    return { ...l, index: k }
  })

  const rooms = []
  const areas = []
  const warnings = []
  let current = null
  let area = null
  let inStat = false            // inside a monster stat block: its text is not read-aloud
  let inNote = false            // inside a DM margin note

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    const next = lines[i + 1]
    const kind = forced.get(`${l.page}:${l.index}`)
    if (kind === 'skip') continue

    const a = l.s.match(AREA_HEAD)
    if (a) { area = { letter: a[1], title: `${a[1]}. ${a[2].trim()}`, page: l.page }; areas.push(area); inStat = false; continue }

    const r = l.s.match(ROOM_HEAD)
    if (r) {
      const code = r[1] + r[2]
      let title = r[3].trim()
      const cont = next && next.page === l.page && Math.abs(next.y - l.y) < 0.03 && /^[A-Z][a-z]/.test(next.s) && next.s.length < 40 && !/[.:]$/.test(next.s)
      if (cont && !r[4]) { title += ' ' + next.s; i++ }
      current = { code, letter: r[1], title, cr: r[4] || null, area: area?.letter || r[1], page: l.page, parts: [], creatures: [], refs: new Set() }
      rooms.push(current)
      inStat = false
      continue
    }

    // a stfunction-number line on its own (page or decoration) is not text
    if (/^\d{1,2}$/.test(l.s)) continue

    // stat block: a name line ("OSTOVITE CR 1", or the name with "CR 1" below it), followed within
    // three lines by its "XP" line and its "hp" line. The name line may be split off from the rest.
    let name = null, cr = null, xpAt = -1, hpAt = -1
    const sn = l.s.match(STAT_NAME_CR)
    if (sn) { name = sn[1]; cr = sn[2] }
    else if (STAT_NAME.test(l.s) && next && CR_LINE.test(next.s)) { name = l.s; cr = next.s.match(CR_LINE)[1]; xpAt = i + 2 }
    else if (STAT_NAME.test(l.s)) {
      const k = [1, 2, 3].find((d) => lines[i + d] && lines[i + d].page === l.page && XP_LINE.test(lines[i + d].s))
      if (k) { name = l.s; xpAt = i + k }
    }
    if (name && current) {
      if (xpAt < 0 && next && CR_LINE.test(next.s)) xpAt = i + 2
      if (xpAt < 0 && next && XP_LINE.test(next.s)) xpAt = i + 1
      const xp = xpAt >= 0 ? lines[xpAt]?.s.match(XP_LINE) : null
      // the hp line follows the XP line, possibly after a line of its own
      const hpI = [0, 1, 2].map((d) => (xpAt >= 0 ? xpAt + d : -1)).find((j) => j >= 0 && lines[j] && HP_LINE.test(lines[j].s))
      const hp = hpI !== undefined ? lines[hpI].s.match(HP_LINE) : null
      current.creatures.push({ name: toTitle(name), cr, xp: xp ? Number(xp[1].replace(/,/g, '')) : null, hp: hp ? Number(hp[1]) : null, bestiary: hp?.[2] || null })
      inStat = true
      i = Math.max(i, hpI !== undefined ? hpI : xpAt >= 0 ? xpAt : i)
      continue
    }

    if (!current) continue

    // headings and labelled parts end a stat block and a margin note
    if (LABEL.test(l.s) || (HEADING_FONTS.test(l.font) && !/Dax/.test(l.font))) { inStat = false; inNote = false }

    // margin note: a CaslonAntique title, then body text. It is DM commentary, not room text.
    if (/CaslonAntique/.test(l.font) && !/Dax/.test(l.font) && l.s.length < 70) {
      inNote = true
      current.parts.push({ type: 'note-title', s: l.s })
      continue
    }
    if (inNote) { current.parts.push({ type: 'note', s: l.s }); continue }

    // trap and hazard stat lines use the same font as the boxes; they are not read aloud
    if (/^(Type|Trigger|Reset|Effect|Perception DC|Disable Device DC|Search DC|Bypass)\b/.test(l.s)) inStat = true

    const isAloud = kind ? kind === 'aloud' : (!inStat && l.font === READ_ALOUD_FONT)
    if (kind === 'note') { inNote = true; current.parts.push({ type: 'note', s: l.s }); continue }
    for (const m of l.s.matchAll(AREA_REF)) current.refs.add(m[1])
    current.parts.push({ type: isAloud ? 'aloud' : 'text', s: l.s })
  }

  const out = rooms.map((r) => {
    const creatures = [...r.creatures]
    const blocks = extractStats(toBlocks(r.parts), creatures)
    return {
      code: r.code, letter: r.letter, area: r.area, title: r.title, cr: r.cr, page: r.page,
      creatures, refs: [...r.refs], blocks,
    }
  })

  // Diagnostics: what the reader could not place, so a book that reads badly can be checked.
  const looksLikeRoom = /^[A-F]\d{1,2}\b/
  const unread = lines
    .filter((l) => looksLikeRoom.test(l.s) && !ROOM_HEAD.test(l.s) && !/^[A-F]\d{1,2}$/.test(l.s) && !/^[A-F]\d{1,2}\s+TO\b/.test(l.s))
    .map((l) => `p${l.page}: ${l.s.slice(0, 90)}`)
  const roomLetters = new Set(out.map((r) => r.letter))
  const emptyAreas = [...new Map(areas.map((a) => [a.letter, a])).values()]
    .filter((a) => !roomLetters.has(a.letter))
    .map((a) => `${a.title} (p${a.page})`)
  const diagnostics = { lines: lines.length, unread: unread.slice(0, 12), emptyAreas }

  return { rooms: out, areas, warnings, diagnostics }
}

const toTitle = (s) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
