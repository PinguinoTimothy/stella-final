// History log: pure helpers. Entries are { t: timestamp, k: kind, m: message, d: detail } (see app.log).
export const HISTORY_FILTERS = [['', 'All'], ['spell', 'Spells'], ['item', 'Items'], ['money', 'Money'], ['rest', 'Rests']]
export const HISTORY_SHOWN = 200

/** Newest first, optionally only one kind. */
export const filterLog = (log, kind) =>
  (Array.isArray(log) ? log : []).filter((e) => !kind || e.k === kind).slice().reverse()

const dayLabel = (t) => new Date(t).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
export const timeLabel = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

/** [{ day: 'Fri, 30 Oct', entries: [...] }]: consecutive entries of the same day share a heading. */
export function groupByDay(entries) {
  const out = []
  for (const e of entries) {
    const day = dayLabel(e.t)
    if (!out.length || out.at(-1).day !== day) out.push({ day, entries: [] })
    out.at(-1).entries.push(e)
  }
  return out
}
