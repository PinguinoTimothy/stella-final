// Everything you can DO to active effects. Components only call these actions.
import { defineStore } from 'pinia'
import { useAppStore } from './app'
import { advance, fmtR, parseDur, RD, UN, selfOf, kindOf } from '../lib/effects'
import { uid } from '../lib/format'
import { useSpells } from './spells'

export const useEffects = defineStore('effects', () => {
  const app = useAppStore()
  const spells = useSpells()
  const byId = (id) => app.S.fx.find((e) => e.id === id) || null

  const running = () => app.S.fx.filter((e) => e.rem > 0).length
  const expired = () => app.S.fx.filter((e) => e.rem === 0).length

  function add(o) { const e = { id: uid(), tg: '', targets: [], note: '', cl: 1, ...o }; app.S.fx.push(e); return e }

  /** "Nueva ronda" and the +1 min / +10 min / +1 hour buttons. */
  function pass(n, label) {
    app.snapshot()
    const gone = advance(app.S.fx, n)
    app.notifyUndo(gone.length ? 'Expired: ' + gone.join(', ') : label)
  }
  const tick = () => pass(1, 'Round passed')
  const skip = (rounds) => pass(rounds, 'Time passed')

  function end(e) {
    app.snapshot(); app.S.fx = app.S.fx.filter((x) => x.id !== e.id)
    app.notifyUndo('Effect ended')
  }
  function clearExpired() { app.snapshot(); app.S.fx = app.S.fx.filter((x) => x.rem !== 0) }

  function adjust(e, d) {
    if (e.rem === null) return
    e.rem = Math.max(0, e.rem + d)
    if (e.rem > (e.tot || 0)) e.tot = e.rem
  }
  const toggleKind = (e) => { e.k = e.k === 'buff' ? 'debuff' : 'buff' }

  /** Saves the "new effect" form. `f` = { n, k, targets, tg, amount, unit, extended, cl, note }. Returns the effect or null. */
  function save(f) {
    const n = String(f.n || '').trim()
    if (!n) return null
    let rem = null
    if (f.unit !== 'perm') {
      const a = +f.amount
      if (!(a > 0)) return null
      rem = Math.round(a * RD[f.unit] * (f.extended ? 2 : 1))
    }
    const targets = f.targets || []
    app.snapshot()
    return add({ n, k: f.k, tg: targets.length ? targets.join(', ') : String(f.tg || '').trim(), targets, rem, tot: rem, cl: f.cl || 1, note: String(f.note || '').trim() })
  }

  /**
   * After casting `name` with caster class index `ci`: tracks it straight away when the duration is fixed.
   * A dice duration (1d4 rounds) opens the Active form pre-filled so the player enters the roll.
   * Returns 'tracked', 'dice' or 'none'.
   */
  function track(name, ci) {
    const d = spells.find(name), c = app.S.cl[ci], p = d && c ? parseDur(d.dur, c.cl || 1) : null
    if (!p) return { state: 'none' }
    if (p.dice) {
      app.closeToast()
      app.ui.fxPrefill = { n: name, ci, u: p.u, a: '', k: kindOf(d), tg: selfOf(d), hint: 'Roll ' + p.dice + ' and enter the result.' }
      app.ui.fxAdd = true; app.ui.tab = 'fx'
      return { state: 'dice' }
    }
    const rem = p.perm ? null : p.a * RD[p.u]
    add({ n: name, k: kindOf(d), tg: selfOf(d), rem, tot: rem, cl: c.cl || 1 })
    app.notify(name + ' tracked: ' + fmtR(rem), { label: 'View', run: () => { app.ui.tab = 'fx' } })
    return { state: 'tracked' }
  }

  /** Toast shown after a cast: spell name + its duration, with Track and Undo. Plain "cast" toast when it has no duration. */
  function offerTrack(name, ci) {
    const d = spells.find(name), c = app.S.cl[ci], p = d && c ? parseDur(d.dur, c.cl || 1) : null
    if (!p) { app.notifyUndo('Lanzado: ' + name); return }
    const when = p.dice ? p.dice + ' ' + UN[p.u] : p.perm ? 'until dismissed' : fmtR(p.a * RD[p.u])
    app.notify(name + ': ' + when, { label: 'Track', run: () => track(name, ci), label2: 'Undo', run2: app.undo })
  }

  return { byId, offerTrack, running, expired, add, tick, skip, end, clearExpired, adjust, toggleKind, save, track }
})
