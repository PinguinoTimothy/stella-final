
<script setup>
import { useAppStore } from '../stores/app'
import { ICON } from '../lib/constants'

const app = useAppStore()

const params = new URLSearchParams(window.location.search)
const isPlayerMode = Boolean(params.get('src') || params.has('view'))

const tabs = isPlayerMode
  ? [['items', 'Items'], ['fx', 'Active'], ['party', 'Party'], ['more', 'More']]
  : [['cast', 'Cast'], ['fx', 'Active'], ['db', 'Spells'], ['items', 'Items'], ['more', 'More']]

const moreTabs = isPlayerMode
  ? ['more', 'skills', 'umr', 'grapple', 'conditions', 'history', 'magicCatalog']
  : ['more', 'party', 'skills', 'umr', 'grapple', 'conditions', 'history', 'magicCatalog', 'setup']

function active(key) {
  return app.ui.tab === key ||
    (key === 'more' && moreTabs.includes(app.ui.tab))
}

function go(tab) {
  app.ui.tab = tab
  window.scrollTo(0, 0)
}
</script>

<template>
  <nav class="nav" aria-label="Sections">
    <div
      class="nav-in"
      :style="{ gridTemplateColumns: `repeat(${tabs.length},1fr)` }"
    >
      <button
        v-for="[key, label] in tabs"
        :key="key"
        :aria-current="active(key) ? 'page' : 'false'"
        :aria-selected="active(key)"
        @click="go(key)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" v-html="ICON[key]" ></svg>
        {{ label }}
      </button>
    </div>
  </nav>
</template>
