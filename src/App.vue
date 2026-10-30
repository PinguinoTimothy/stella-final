<script setup>
import { computed, onMounted, onUnmounted } from "vue";
import BottomNav from "./components/BottomNav.vue";
import ConfirmDialog from "./components/ConfirmDialog.vue";
import ToastHost from "./components/ToastHost.vue";
import ItemsView from "./views/ItemsView.vue";
import MoreView from "./views/MoreView.vue";
import SetupView from "./views/SetupView.vue";
import PlaceholderView from "./views/PlaceholderView.vue";
import { useAppStore } from "./stores/app";
import CastView from "./views/CastView.vue";
import PartyView from "./views/PartyView.vue";
import MagicCatalogView from "./views/MagicCatalogView.vue";
import PlayerView from "./views/PlayerView.vue";
import SkillsView from './views/SkillsView.vue'
import UmrView from './views/UmrView.vue'
import FxView from './views/FxView.vue'
import FxPlayerView from './views/FxPlayerView.vue'
import SpellsView from "./views/SpellsView.vue";

import GrappleView from './views/GrappleView.vue'
import ConditionsView from './views/ConditionsView.vue'


const app = useAppStore();

let viewerTimer;

onMounted(() => {
  if (!app.viewer) return;

  app.loadViewer();
  viewerTimer = setInterval(() => {
    if (!document.hidden) app.loadViewer();
  }, 10000);

  document.addEventListener("visibilitychange", refreshViewer);
});

onUnmounted(() => {
  clearInterval(viewerTimer);
  document.removeEventListener("visibilitychange", refreshViewer);
});

function refreshViewer() {
  if (!document.hidden && app.viewer) app.loadViewer();
}

const views = {
  items: ItemsView,
  more: MoreView,
  setup: SetupView,
  cast: CastView,
  party: PartyView,
  magicCatalog: MagicCatalogView,
  skills: SkillsView,
  umr: UmrView,
  fx: FxView,
  db: SpellsView,
    grapple: GrappleView,
  conditions: ConditionsView,
};

const titles = {
  cast: "Cast",
  fx: "Active effects",
  db: "Spells",
};

const view = computed(() => views[app.ui.tab]);
</script>

<template>
  <BottomNav />

  <PlayerView v-if="app.viewer && app.ui.tab === 'items'" />

  <PartyView
    v-else-if="app.viewer && app.ui.tab === 'party'"
    :readonly="true"
  />

  <FxPlayerView v-else-if="app.viewer && app.ui.tab === 'fx'" />

  <MoreView v-else-if="app.viewer && app.ui.tab === 'more'" />

  <MagicCatalogView v-else-if="app.viewer && app.ui.tab === 'magicCatalog'" />
  <SkillsView v-else-if="app.viewer && app.ui.tab === 'skills'" />
<UmrView v-else-if="app.viewer && app.ui.tab === 'umr'" />
    <GrappleView v-else-if="app.viewer && app.ui.tab === 'grapple'" />
  <ConditionsView v-else-if="app.viewer && app.ui.tab === 'conditions'" />

  <PlaceholderView
    v-else-if="app.viewer"
    :title="titles[app.ui.tab] || app.ui.tab"
  />

  <template v-else>
    <component :is="view" v-if="view" />
    <PlaceholderView v-else :title="titles[app.ui.tab]" />
    <ToastHost />
    <ConfirmDialog />
  </template>
</template>
