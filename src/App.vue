<script setup>
import { computed, watchEffect } from 'vue'
import { useAppStore } from './stores/app'
import { useCloudStore } from './stores/cloud'
import { useViewerPolling } from './composables/useViewerPolling'
import BottomNav from './components/BottomNav.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import ToastHost from './components/ToastHost.vue'
import CombatTray from './components/Monsters/CombatTray.vue'
import InitiativeRail from './components/Initiative/InitiativeRail.vue'
import LoginView from './views/LoginView.vue'
import PlaceholderView from './views/PlaceholderView.vue'
import CastView from './views/CastView.vue'
import ConditionsView from './views/ConditionsView.vue'
import FxPlayerView from './views/FxPlayerView.vue'
import FxView from './views/FxView.vue'
import GrappleView from './views/GrappleView.vue'
import HistoryView from './views/HistoryView.vue'
import ItemsView from './views/ItemsView.vue'
import EquipmentCatalogView from './views/EquipmentCatalogView.vue'
import MagicCatalogView from './views/MagicCatalogView.vue'
import MonsterCatalogView from './views/MonsterCatalogView.vue'
import MoreView from './views/MoreView.vue'
import PartyView from './views/PartyView.vue'
import PlayerView from './views/PlayerView.vue'
import SetupView from './views/SetupView.vue'
import SkillsView from './views/SkillsView.vue'
import SpellsView from './views/SpellsView.vue'
import UmrView from './views/UmrView.vue'
  import GuideMascot from './components/Guide/GuideMascot.vue'
import PeekSheet from './components/Refs/PeekSheet.vue'
import MapsView from './views/MapsView.vue'
  import DmLoginView from './views/DmLoginView.vue'
  import ReferenceSearch from './components/Reference/ReferenceSearch.vue'


const app = useAppStore()
const cloud = useCloudStore()
useViewerPolling()
watchEffect(() => document.body.classList.toggle('ro-mode', app.mode !== 'dev'))

// The admin app needs a session. Players (?view=1) skip the gate; what they can read is limited by the database policies.
  const locked = computed(() =>
    app.mode === 'dev' ? !cloud.session : app.mode === 'dm' ? !cloud.dmPin : false,
  )

// One table per mode: tab → view, or [view, props]. A tab that is not listed shows the placeholder.
const editorViews = {
  cast: CastView,
  fx: FxView,
  db: SpellsView,
  items: ItemsView,
  more: MoreView,
  setup: SetupView,
  party: PartyView,
  magicCatalog: MagicCatalogView,
  equipmentCatalog: EquipmentCatalogView,
  monsters: MonsterCatalogView,
  skills: SkillsView,
  umr: UmrView,
  grapple: GrappleView,
  conditions: ConditionsView,
  history: HistoryView,
  maps: MapsView
}

const playerViews = {
  items: PlayerView,
  fx: FxPlayerView,
  party: [PartyView, { readonly: true }],
  more: MoreView,
  magicCatalog: MagicCatalogView,
  equipmentCatalog: EquipmentCatalogView,
  skills: SkillsView,
  umr: UmrView,
  grapple: GrappleView,
  conditions: ConditionsView,
  history: HistoryView,
}

const titles = { cast: 'Cast', fx: 'Active effects', db: 'Spells' }

// Setup changes the campaign's structure, so only the dev sees it.
const devOnlyTabs = ['setup']
const entry = computed(() => {
  if (app.mode === 'dm' && devOnlyTabs.includes(app.ui.tab)) return undefined
  return (app.viewer ? playerViews : editorViews)[app.ui.tab]
})
const view = computed(() => (Array.isArray(entry.value) ? entry.value[0] : entry.value))
const viewProps = computed(() => (Array.isArray(entry.value) ? entry.value[1] : {}))
// In player mode an unknown tab falls back to its own name, as before.
const title = computed(() => titles[app.ui.tab] || (app.viewer ? app.ui.tab : ''))
</script>

<template>
  <template v-if="locked">
    <DmLoginView v-if="app.mode === 'dm'" />
    <LoginView v-else />
  </template>
    <template v-else>
    <BottomNav />
    <component :is="view" v-if="view" v-bind="viewProps" />
    <PlaceholderView v-else :title="title" />
    <ToastHost />
    <template v-if="app.mode !== 'player'">
      <CombatTray />
      <InitiativeRail />
    </template>
    <ConfirmDialog />
    <ReferenceSearch />
          <GuideMascot />
          <PeekSheet />
  </template>
</template>