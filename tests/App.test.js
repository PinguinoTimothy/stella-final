import { describe, expect, it, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import App from '../src/App.vue'
import { useAppStore } from '../src/stores/app'
import { sampleParty, sampleState } from './helpers'

function setup(tab, viewer) {
  const pinia = createPinia(); setActivePinia(pinia)
  const app = useAppStore(); app.replace(sampleState(), sampleParty()); app.ui.tab = tab; app.viewer = viewer
  app.loadViewer = () => {}
  return { app, w: mount(App, { global: { plugins: [pinia] } }) }
}

describe('App routing', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('editor mode: each tab renders its view, with toast and confirm host', () => {
    expect(setup('skills', false).w.find('input[aria-label="Search skills"]').exists()).toBe(true)
    const { w } = setup('fx', false)
    expect(w.text()).toContain('Hechizos activos')
    expect(setup('items', false).w.find('.ic').exists()).toBe(true)
  })

  it('player mode: fx is read only, party is read only, unknown tabs show the placeholder', () => {
    const fx = setup('fx', true).w
    expect(fx.text()).toContain('Bless'); expect(fx.find('.fx-end').exists()).toBe(false)
    expect(setup('party', true).w.find('button.danger.wide').exists()).toBe(false)
    expect(setup('setup', true).w.text()).toContain('Not ported')
  })

  it('player mode does not mount the toast host', () => {
    const { app, w } = setup('items', true)
    app.notify('hello')
    return w.vm.$nextTick().then(() => expect(w.find('#toast').exists()).toBe(false))
  })
})
