import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAppStore } from '../src/stores/app'
import { useCloudStore } from '../src/stores/cloud'
import { sampleParty, sampleState } from './helpers'

/* A tiny in-memory stand-in for PostgREST + the apply_changes function */
const PK = { characters: 'name', wallets: 'owner', settings: 'key' }
function fakeSupabase() {
  const T = {}; ['characters', 'wallets', 'caster_classes', 'class_spells', 'items', 'effects', 'spells', 'settings'].forEach((t) => { T[t] = [] })
  let rev = null; const log = []
  const R = (x, status = 200) => Promise.resolve({ ok: status < 300, status, json: async () => x })
  const fetch = vi.fn(async (url, o = {}) => {
    const u = new URL(url)
    if (u.pathname.includes('/auth/v1/token')) return R({ access_token: 'T', refresh_token: 'R', expires_in: 3600 })
    if (u.pathname.endsWith('/rpc/apply_changes')) {
      const b = JSON.parse(o.body)
      if ((rev ?? 0) !== b.expected) { log.push('409'); return R({ message: 'conflict' }, 409) }
      let n = 0
      for (const t of Object.keys(T)) {
        const c = b.changes[t] || { up: [], del: [] }, pk = PK[t] || 'id'
        c.up.forEach((r) => { const i = T[t].findIndex((x) => x[pk] === r[pk]); i >= 0 ? (T[t][i] = r) : T[t].push(r); n++ })
        c.del.forEach((id) => { T[t] = T[t].filter((x) => x[pk] !== id); n++ })
        if (b.full) { const keep = new Set(c.up.map((r) => r[pk])); T[t] = T[t].filter((r) => keep.has(r[pk])) }
      }
      rev = (rev ?? 0) + 1; log.push((b.full ? 'FULL ' : '') + 'rows ' + n + ' -> rev ' + rev); return R(rev)
    }
    if (u.pathname.endsWith('/sync_state')) return R(rev == null ? [] : [{ rev, updated_at: new Date().toISOString() }])
    const t = u.pathname.split('/rest/v1/')[1]
    let rows = T[t] || []
    if (u.searchParams.get('custom') === 'eq.true') rows = rows.filter((r) => r.custom)
    const off = +u.searchParams.get('offset') || 0
    return R(rows.slice(off, off + 1000))
  })
  return { fetch, T, log, get rev() { return rev } }
}

function device(fake, { signedIn = true } = {}) {
  localStorage.clear()
  if (signedIn) localStorage.setItem('pf1e-sb-session', JSON.stringify({ at: 'T', rt: 'R', exp: Date.now() + 3e6, email: 'a@b.c' }))
  setActivePinia(createPinia())
  return { app: useAppStore(), cloud: useCloudStore() }
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

describe('cloud sync', () => {
  let fake
  beforeEach(() => { fake = fakeSupabase(); vi.stubGlobal('fetch', fake.fetch) })

  it('first sign-in uploads local data; edits send only the diff', async () => {
    const A = device(fake); A.app.replace(sampleState(), sampleParty())
    A.cloud.init(); await wait(50)
    expect(fake.log[0]).toMatch(/^FULL/)
    expect(fake.T.items).toHaveLength(4); expect(fake.T.class_spells).toHaveLength(3)
    A.app.S.items[0].cur = 4; await wait(1800)
    expect(fake.log.at(-1)).toBe('rows 1 -> rev 2')
    A.app.S.items.splice(3, 1); await wait(1800)
    expect(fake.T.items).toHaveLength(3)
  }, 15000)

  it('a second empty device downloads the cloud state', async () => {
    const A = device(fake); A.app.replace(sampleState(), sampleParty()); A.cloud.init(); await wait(50)
    const B = device(fake); expect(B.app.S.items).toHaveLength(0)
    B.cloud.init(); await wait(80)
    expect(B.app.S.items.map((i) => i.n)).toContain('Wand of CLW')
    expect(B.app.S.items[0].mystery).toBe('keep-me')
    expect(B.app.party).toEqual(['Bob', 'Ann'])
    expect(B.app.S.cl[0].sp[1]).toHaveLength(2)
  })

  it('detects two devices editing; "keep mine" overwrites, "use cloud" adopts', async () => {
    const A = device(fake); A.app.replace(sampleState(), sampleParty()); A.cloud.init(); await wait(50)
    const B = device(fake); B.cloud.init(); await wait(80)
    B.app.S.items[2].qty = 9; await wait(1800)                       // B saves first
    A.app.S.items[2].qty = 7; await wait(1800)                       // A still on the old revision
    expect(A.cloud.state).toBe('conflict'); expect(fake.log).toContain('409')
    expect(fake.T.items.find((i) => i.id === 'i3').qty).toBe(9)      // nothing was overwritten silently
    await A.cloud.force()
    expect(fake.T.items.find((i) => i.id === 'i3').qty).toBe(7)
    expect(A.cloud.state).toBe('ok')
    // B edits again, A edits too -> A chooses the cloud copy
    await B.cloud.sync()                                              // B catches up first (it was stale)
    B.app.S.items[0].n = 'Renamed by B'; await wait(1800)
    A.app.S.items[1].qty = 3; await wait(1800)
    expect(A.cloud.state).toBe('conflict')
    localStorage.setItem('pf1e-spells-v2', 'A local copy')           // (the simulator shares one localStorage)
    await A.cloud.pull()
    expect(A.app.S.items[0].n).toBe('Renamed by B')
    expect(localStorage.getItem('pf1e-spells-v2-backup')).toBe('A local copy')   // the discarded local copy is kept
  }, 30000)
})
