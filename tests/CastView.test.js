import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CastView from '../src/views/CastView.vue'
import { useAppStore } from '../src/stores/app'
import { useSpells } from '../src/stores/spells'
import { sampleParty, sampleState } from './helpers'

const domain = [{ n: 'Endure Elements', s: 'Abjuration', d: 'x', domainName: 'Sun' }, { n: 'Burning Hands', s: 'Evocation', d: 'y', domainName: 'Sun' }]
const catalog = [{ n: 'Shield', s: 'Abjuration', lv: 'Clr 1', d: 's' }, { n: 'Bless', s: 'Enchantment', lv: 'Clr 1', d: 'b' }]

async function setup() {
  const pinia = createPinia(); setActivePinia(pinia)
  const app = useAppStore(); app.replace(sampleState(), sampleParty())
  const sp = useSpells()
  sp.loadForCast = async () => ({ rows: catalog }); sp.loadDomainCandidates = async () => domain; sp.ensure = async () => {}
  const w = mount(CastView, { global: { plugins: [pinia] }, attachTo: document.body })
  await flushPromises()
  return { app, w }
}

describe('CastView', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('shows slots per level and spends one with the Cast button', async () => {
    const { app, w } = await setup()
    expect(w.findAll('.lvs')).toHaveLength(5)                    // levels 0–4
    await w.find('.spell .cast').trigger('click')
    expect(app.S.cl[0].used[1]).toBe(2); expect(app.S.cl[0].sp[1][0].left).toBe(0)
    expect(app.S.log.at(-1).m).toBe('Cure Light Wounds'); expect(app.toast.label2).toBe('Undo')
  })

  it('tapping a slot pip toggles it and Undo restores', async () => {
    const { app, w } = await setup()
    await w.findAll('.lvs')[1].find('.pip').trigger('click')     // first pip of level 1 is spent → restore
    expect(app.S.cl[0].used[1]).toBe(0)
    app.undo(); expect(app.S.cl[0].used[1]).toBe(1)
  })

  it('casts the domain spell with the domain slot', async () => {
    const { app, w } = await setup()
    await w.findAll('.domain-spell-panel select')[0].setValue('Burning Hands')
    expect(app.S.cl[0].dsel[1]).toBe('Burning Hands')
    await w.findAll('.domain-spell-panel .cast')[0].trigger('click')
    expect(app.S.cl[0].dused[1]).toBe(1)
    expect(w.findAll('.domain-spell-panel .cast')[0].attributes('disabled')).toBeDefined()
  })

  it('prepare mode adds from the catalog and prepares copies', async () => {
    const { app, w } = await setup()
    await w.findAll('.seg button')[1].trigger('click')
    await w.findAll('.lvb')[1].trigger('click')
    await w.find('input.known-catalog-search').setValue('shi')
    await w.find('.catalog-results button').trigger('click')
    expect(app.S.cl[0].sp[1].some((s) => s.n === 'Shield')).toBe(true)
    const row = w.findAll('.spell').find((a) => a.text().includes('Shield'))
    await row.findAll('.step button')[1].trigger('click')
    expect(app.S.cl[0].sp[1].find((s) => s.n === 'Shield')).toMatchObject({ prep: 1, left: 1 })
  })

  it('resting refills slots and prepared copies, and ends short effects', async () => {
    const { app, w } = await setup()
    app.S.fx[0].rem = 100
    w.find('button.rest').trigger('click'); await flushPromises()
    app.dialog.done(true); await flushPromises()
    expect(app.S.cl[0].used[1]).toBe(0); expect(app.S.cl[0].sp[1][0].left).toBe(2); expect(app.S.fx).toHaveLength(0)
    expect(app.S.log.at(-1).k).toBe('rest')
  })

  it('shows the empty state when there are no classes', async () => {
    const pinia = createPinia(); setActivePinia(pinia)
    useAppStore().replace({ cl: [] })
    expect(mount(CastView, { global: { plugins: [pinia] } }).text()).toContain('Aún no hay clases')
  })
})
