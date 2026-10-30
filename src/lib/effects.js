// Active effects: durations are always stored in ROUNDS (1 round = 6 s, 10 rounds = 1 min).
export const RD = { rd: 1, min: 10, hr: 600, day: 14400 }
export const UN = { rd: 'rounds', min: 'minutes', hr: 'hours', day: 'days' }

const unitOf = (x) => { x = x.charAt(0); return x === 'r' ? 'rd' : x === 'm' ? 'min' : x === 'h' ? 'hr' : 'day' }

/** Reads a duration like "1 round/level (D)", "10 min./level", "1d4 rounds", "1 round/2 levels". */
export function parseDur(str, cl) {
  const s = String(str || '').toLowerCase().replace(/\s+/g, ' ').trim()
  let m
  if (!s) return null
  m = s.match(/(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?\s*(round|rd|min|hour|hr|day)/)
  if (m) return { dice: m[1] + 'd' + m[2] + (m[3] ? m[3] + m[4] : ''), u: unitOf(m[5]) }
  /* Archives of Nethys database format: "minutes/level (1)" */
  m = s.match(/(rounds?|rds?|minutes?|mins?\.?|hours?|hrs?\.?|days?|weeks?|wks?\.?)\s*(?:\/|per)\s*(?:(\d+)\s*)?(?:caster\s*)?levels?\s*\(\s*(\d+)\s*\)/)
  if (m) {
    const n = +m[3], divisor = +m[2] || 1
    let amount = Math.max(n, n * Math.floor(Math.max(1, +cl || 1) / divisor)), u = unitOf(m[1])
    if (/^w/.test(m[1])) { amount *= 7; u = 'day' }
    return { a: amount, u, concentration: /concentration/.test(s), maximum: /\bup to\b/.test(s) }
  }
  m = s.match(/(\d+)\s*(round|rd|min|hour|hr|day)[a-z.]*\s*(?:\/|per)\s*(\d+)?\s*(?:caster\s*)?levels?/)
  if (m) { const n = +m[1], dv = +m[3] || 1; return { a: Math.max(n, n * Math.floor((cl || 1) / dv)), u: unitOf(m[2]) } }
  m = s.match(/(\d+)\s*(round|rd|min|hour|hr|day)/)
  if (m) return { a: +m[1], u: unitOf(m[2]) }
  if (/permanent|until|concentration/.test(s)) return { perm: true }
  return null
}

/** Long form: "3 rounds", "2 min 4 rd", "1 h 30 min", "2 d 6 h". */
export function fmtR(r) {
  if (r === null) return 'until dismissed'
  if (r <= 0) return 'expired'
  if (r < 20) return r + (r === 1 ? ' round' : ' rounds')
  if (r < 600) { const m = Math.floor(r / 10), x = r % 10; return m + ' min' + (x ? ' ' + x + ' rd' : '') }
  if (r < 14400) { const h = Math.floor(r / 600), mi = Math.floor((r % 600) / 10); return h + ' h' + (mi ? ' ' + mi + ' min' : '') }
  const d = Math.floor(r / 14400), hh = Math.floor((r % 14400) / 600)
  return d + ' d' + (hh ? ' ' + hh + ' h' : '')
}

/** Short form for the chip strip: "3r", "5min", "2h", "1d", "∞", "!". */
export const shR = (r) => r === null ? '∞' : r <= 0 ? '!' : r < 20 ? r + 'r' : r < 600 ? Math.ceil(r / 10) + 'min' : r < 14400 ? Math.ceil(r / 600) + 'h' : Math.ceil(r / 14400) + 'd'

/** Soonest to expire first, "no limit" last. */
export function fxCmp(a, b) {
  const x = a.rem === null ? 1e9 : a.rem, y = b.rem === null ? 1e9 : b.rem
  return x - y || String(a.n).localeCompare(String(b.n))
}

/** Beneficial unless the spell allows a save that isn't harmless. */
export function kindOf(d) { const s = String(d.sv || '').toLowerCase(); return (!s || /harmless|^none/.test(s)) ? 'buff' : 'debuff' }
export const selfOf = (d) => /^personal/i.test(d.rng || '') ? 'Self' : ''

/** Width of the progress bar, 0–100. */
export const fxPct = (e) => e.rem === null ? 100 : Math.max(0, Math.min(100, e.rem / (e.tot || e.rem || 1) * 100))

/** Does effect `e` affect character `name`? Matches the targets list or the free-text target. */
export function fxHit(e, name) {
  const n = String(name).toLowerCase()
  return (e.targets || []).some((t) => String(t).toLowerCase() === n) || String(e.tg || '').toLowerCase().includes(n)
}

/** Advances time by `n` rounds. Returns the names of effects that just expired. */
export function advance(fx, n) {
  const gone = []
  fx.forEach((e) => {
    if (e.rem === null || e.rem <= 0) return
    e.rem = Math.max(0, e.rem - n)
    if (!e.rem) gone.push(e.n)
  })
  return gone
}
