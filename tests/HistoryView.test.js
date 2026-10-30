import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HistoryView from '../src/views/HistoryView.vue'
import { useAppStore } from '../src/stores/app'
import { filterLog, groupByDay } from '../src/lib/history'
import { sampleParty, sampleState } from './helpers'

const DAY = 86400000, NOW = new Date(2026, 9, 30, 12, 0).getTime()
// The log is written oldest first, like app.log does.
const log = [
  { t: NOW - 2 * DAY, k: 'rest', m: 'Rested', d: 'All restored' },
  { t: NOW - 3600000, k: 'spell', m: 'Bless', d: 'Cleric · level 1' },
  { t: NOW - 60000, k: 'money', m: 'Paid 5 gp', d: '' },
  { t: NOW, k: 'item', m: 'Used a charge of Wand', d: '4/50 left' },
]

function setup(viewer = false) {
  const pinia = createPinia(); setActivePinia(pinia)
  const app = useAppStore(); app.replace({ ...sampleState(), log: log.map((e) => ({ ...e })) }, sampleParty()); app.viewer = viewer
  return { app, w: mount(HistoryView, { global: { plugins: [pinia] } }) }
}

describe('history helpers', () => {
  it('filters by kind, newest first, and groups by day', () => {
    expect(filterLog(log, '').map((e) => e.m)).toEqual(['Used a charge of Wand', 'Paid 5 gp', 'Bless', 'Rested'])
    expect(filterLog(log, 'spell').map((e) => e.m)).toEqual(['Bless'])
    expect(filterLog(undefined, '')).toEqual([])
    const g = groupByDay(filterLog(log, ''))
    expect(g).toHaveLength(2); expect(g[0].entries).toHaveLength(3); expect(g[1].entries[0].m).toBe('Rested')
  })
})

describe('HistoryView', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('lists entries newest first with their detail, grouped under day headings', () => {
    const { w } = setup()
    const rows = w.findAll('.hrow')
    expect(rows).toHaveLength(4); expect(rows[0].text()).toContain('Used a charge of Wand'); expect(rows[0].text()).toContain('4/50 left')
    expect(w.findAll('h3.ig-h')).toHaveLength(2)
    expect(w.text()).toContain('Showing the latest 4 of 4')
  })

  it('filters with the chips and shows the empty state', async () => {
    const { w, app } = setup()
    await w.findAll('.chip').find((c) => c.text() === 'Spells').trigger('click')
    expect(w.findAll('.hrow')).toHaveLength(1); expect(app.ui.hf).toBe('spell')
    app.S.log = []; await w.vm.$nextTick()
    expect(w.text()).toContain('Nothing here yet')
  })

  it('clear asks first, empties the log, and Undo brings it back', async () => {
    const { w, app } = setup()
    w.find('button.danger').trigger('click'); await w.vm.$nextTick()
    app.dialog.done(false); await new Promise((r) => setTimeout(r)); expect(app.S.log).toHaveLength(4)
    w.find('button.danger').trigger('click'); await w.vm.$nextTick()
    app.dialog.done(true); await new Promise((r) => setTimeout(r)); expect(app.S.log).toHaveLength(0)
    app.undo(); expect(app.S.log).toHaveLength(4)
  })

  it('players can read the history but not clear it', () => {
    const { w } = setup(true)
    expect(w.findAll('.hrow')).toHaveLength(4); expect(w.find('button.danger').exists()).toBe(false)
  })

  it('shows only the latest 200 entries', () => {
    const { app, w } = setup()
    app.S.log = Array.from({ length: 300 }, (_, i) => ({ t: NOW - i * 1000, k: 'spell', m: 'x' + i, d: '' }))
    return w.vm.$nextTick().then(() => { expect(w.findAll('.hrow')).toHaveLength(200); expect(w.text()).toContain('Showing the latest 200 of 300') })
  })
})
