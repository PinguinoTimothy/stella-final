<script setup>
import { computed, defineAsyncComponent, watchEffect } from 'vue';
import { useAppStore } from './stores/app';
import { useCloudStore } from './stores/cloud';
import { useViewerPolling } from './composables/useViewerPolling';
import BottomNav from './components/BottomNav.vue';
import MascotBar from './components/MascotBar.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import SheetDock from './components/Sheets/SheetDock.vue';
import SheetPanel from './components/Sheets/SheetPanel.vue';
import ToastHost from './components/ToastHost.vue';
import LoginView from './views/LoginView.vue';
import PlaceholderView from './views/PlaceholderView.vue';
import CombatPanel from './components/Combat/CombatPanel.vue';
import PeekSheet from './components/Refs/PeekSheet.vue';
import DmLoginView from './views/DmLoginView.vue';
import ReferenceSearch from './components/Reference/ReferenceSearch.vue';
import { useTabHistory } from './composables/useTabHistory';

const lazyView = loader => defineAsyncComponent(loader);
const CastView = lazyView(() => import('./views/CastView.vue'));
const ConditionsView = lazyView(() => import('./views/ConditionsView.vue'));
const FxPlayerView = lazyView(() => import('./views/FxPlayerView.vue'));
const FxView = lazyView(() => import('./views/FxView.vue'));
const GrappleView = lazyView(() => import('./views/GrappleView.vue'));
const HistoryView = lazyView(() => import('./views/HistoryView.vue'));
const ItemsView = lazyView(() => import('./views/ItemsView.vue'));
const EquipmentCatalogView = lazyView(() => import('./views/EquipmentCatalogView.vue'));
const MagicCatalogView = lazyView(() => import('./views/MagicCatalogView.vue'));
const MonsterCatalogView = lazyView(() => import('./views/MonsterCatalogView.vue'));
const MoreView = lazyView(() => import('./views/MoreView.vue'));
const PartyView = lazyView(() => import('./views/PartyView.vue'));
const PlayerView = lazyView(() => import('./views/PlayerView.vue'));
const SetupView = lazyView(() => import('./views/SetupView.vue'));
const SkillsView = lazyView(() => import('./views/SkillsView.vue'));
const SpellsView = lazyView(() => import('./views/SpellsView.vue'));
const UmrView = lazyView(() => import('./views/UmrView.vue'));
const MapsView = lazyView(() => import('./views/MapsView.vue'));
const FeatsView = lazyView(() => import('./views/FeatsView.vue'));
const RulesView = lazyView(() => import('./views/RulesView.vue'));
const SlayerCalcView = lazyView(() => import('./views/SlayerCalcView.vue'));
const SheetsView = lazyView(() => import('./views/SheetsView.vue'));
const app = useAppStore();
const cloud = useCloudStore();
useViewerPolling();
useTabHistory();
watchEffect(() => document.body.classList.toggle('ro-mode', app.mode !== 'dev'));

// The admin app needs a session. Players (?view=1) skip the gate; what they can read is limited by the database policies.
const locked = computed(() => (app.mode === 'dev' ? !cloud.session : app.mode === 'dm' ? !cloud.dmPin : false));

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
  maps: MapsView,
  feats: FeatsView,
  rules: RulesView,
  slayer: SlayerCalcView,
  sheets: SheetsView,
};

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
  feats: FeatsView,
  rules: RulesView,
  slayer: SlayerCalcView,
};

const titles = { cast: 'Cast', fx: 'Active effects', db: 'Spells' };

// Setup changes the campaign's structure, so only the dev sees it.
const devOnlyTabs = ['setup'];
const entry = computed(() => {
  if (app.mode === 'dm' && devOnlyTabs.includes(app.ui.tab)) return undefined;
  return (app.viewer ? playerViews : editorViews)[app.ui.tab];
});
const view = computed(() => (Array.isArray(entry.value) ? entry.value[0] : entry.value));
const viewProps = computed(() => (Array.isArray(entry.value) ? entry.value[1] : {}));
// In player mode an unknown tab falls back to its own name, as before.
const title = computed(() => titles[app.ui.tab] || (app.viewer ? app.ui.tab : ''));
</script>

<template>
  <template v-if="locked">
    <DmLoginView v-if="app.mode === 'dm'" />
    <LoginView v-else />
  </template>
  <template v-else>
    <BottomNav />
    <MascotBar />
    <Transition name="page" mode="out-in">
      <component :is="view" v-if="view" :key="`view-${app.ui.tab}`" v-bind="viewProps" />
      <PlaceholderView v-else :key="`placeholder-${app.ui.tab}`" :title="title" />
    </Transition>
    <ToastHost />
    <template v-if="!app.viewer">
      <SheetDock />
      <SheetPanel />
    </template>
    <CombatPanel v-if="app.mode !== 'player'" />
    <ConfirmDialog />
    <ReferenceSearch />
    <PeekSheet />
  </template>
</template>
