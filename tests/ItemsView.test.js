import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ItemsView from '../src/views/ItemsView.vue'
import App from '../src/App.vue'
import { useAppStore } from '../src/stores/app'
import { sampleParty, sampleState } from './helpers'

function setup() {
  const pinia = createPinia(); setActivePinia(pinia)
  const app = useAppStore(); app.replace(sampleState(), sampleParty())
  return { app, pinia }
}
const text = (w) => w.text().replace(/\s+/g, ' ')

describe('ItemsView', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('groups items and filters by owner chip and search', async () => {
    const { pinia } = setup()
    const w = mount(ItemsView, { global: { plugins: [pinia] } })
    expect(w.findAll('.ic')).toHaveLength(4)
    await w.findAll('.chip').find((c) => c.text().startsWith('Ann')).trigger('click')
    expect(w.findAll('.ic')).toHaveLength(1)
    await w.findAll('.chip')[0].trigger('click')
    await w.find('input.sr').setValue('rope')
    expect(w.findAll('.ic')).toHaveLength(1)
    expect(text(w)).toContain('Rope')
  })

  it('quick stepper spends a charge, and Undo restores it', async () => {
    const { app, pinia } = setup()
    const w = mount(App, { global: { plugins: [pinia] } })
    await w.find('button[aria-label="Use one charge"]').trigger('click')
    expect(app.S.items[0].cur).toBe(4)
    expect(app.S.log.at(-1).m).toContain('Used a charge')
    expect(app.toast.label).toBe('Undo')
    await w.find('#toast .go').trigger('click')
    expect(app.S.items[0].cur).toBe(5)
  })

  it('opens the detail sheet, edits an item and saves', async () => {
    const { app, pinia } = setup()
    const w = mount(App, { global: { plugins: [pinia] }, attachTo: document.body })
    await w.findAll('.ic-main').find((b) => b.text().includes('Wand of CLW')).trigger('click')
    expect(document.querySelector('.sheet')).toBeTruthy()
    const edit = [...document.querySelectorAll('.det-actions button')].find((b) => b.textContent === 'Edit')
    edit.click(); await w.vm.$nextTick()
    const name = document.querySelector('#f-name'); name.value = 'Wand of CMW'; name.dispatchEvent(new Event('input'))
    document.querySelector('form.item-form').dispatchEvent(new Event('submit', { cancelable: true }))
    await w.vm.$nextTick()
    expect(app.S.items[0].n).toBe('Wand of CMW')
    expect(document.querySelector('.sheet')).toBeFalsy()
    w.unmount()
  })

  it('adds a new item with the + button', async () => {
    const { app, pinia } = setup()
    const w = mount(App, { global: { plugins: [pinia] }, attachTo: document.body })
    await w.find('.fab').trigger('click')
    const name = document.querySelector('#f-name'); name.value = 'Cloak of Resistance'; name.dispatchEvent(new Event('input'))
    document.querySelector('form.item-form').dispatchEvent(new Event('submit', { cancelable: true }))
    await w.vm.$nextTick()
    expect(app.S.items.at(-1).n).toBe('Cloak of Resistance')
    expect(app.S.items.at(-1).id).toBeTruthy()
    w.unmount()
  })

  it('equipping from the row marks it and shows in the equipped tab', async () => {
    const { app, pinia } = setup()
    app.S.items.push({ id: 'i9', n: 'Longsword', owner: 'Bob', k: 'Weapon', qty: 1, equipped: false })
    const w = mount(ItemsView, { global: { plugins: [pinia] } })
    await w.findAll('.ic-eq').find((b) => b.text() === 'Equip').trigger('click')
    expect(app.S.items.at(-1)).toMatchObject({ equipped: true, slot: 'Main hand' })
    await w.findAll('.items-tabs button')[1].trigger('click')
    expect(text(w)).toContain('Main hand')
  })
})
