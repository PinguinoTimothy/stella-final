<script setup lang="ts">
import { useAppStore } from '../stores/app';
import { useCloudStore } from '../stores/cloud';
import { nextTick } from 'vue';

const app = useAppStore();
const cloud = useCloudStore();

function openTab(
  tab:
    | 'party'
    | 'setup'
    | 'magicCatalog'
    | 'equipmentCatalog'
    | 'maps'
    | 'skills'
    | 'umr'
    | 'grapple'
    | 'conditions'
    | 'history'
    | 'monsters'
    | 'feats'
    | 'rules'
    | 'creator',
) {
  if (app.viewer && tab === 'setup') return;
  app.ui.tab = tab;
  nextTick(() => window.scrollTo(0, 0));
}
</script>

<template>
  <h2 class="pg">Mas</h2>

  <details v-if="app.mode === 'dev'" class="panel fold" data-k="share">
    <summary>Cloud save</summary>

    <div class="grid">
      <template v-if="cloud.session">
        <p class="mute" style="margin: 0">
          Signed in as <b>{{ cloud.session.email }}</b
          >. Changes are saved to your database automatically; this device keeps a copy for offline use.
        </p>

        <div class="mute" role="status">
          {{ cloud.status }}
        </div>

        <template v-if="cloud.state === 'conflict'">
          <button class="cast" @click="cloud.pull()">Use the cloud version</button>

          <button class="danger" @click="cloud.force()">Keep this device’s version</button>
        </template>

        <button v-else class="cast" @click="cloud.sync()">Sync now</button>

        <button class="danger" @click="cloud.signOut()">Sign out</button>
      </template>
    </div>
  </details>

  <template v-if="!app.viewer">
    <button v-if="app.mode !== 'player'" class="more-row setup-link" @click="openTab('setup')">
      <span>
        <b>Setup</b>
      </span>
      <span aria-hidden="true">›</span>
    </button>
  </template>

  <button class="more-row setup-link" @click="openTab('party')">
    <span>
      <b>Party</b>
    </span>
    <span aria-hidden="true">›</span>
  </button>

  <button v-if="!app.viewer" class="more-row setup-link" @click="openTab('maps')">
    <span>
      <b>Aventuras</b>
    </span>
    <span aria-hidden="true">›</span>
  </button>

  <button class="more-row setup-link" @click="openTab('monsters')">
    <span>
      <b>Bestiario</b>
    </span>
    <span aria-hidden="true">›</span>
  </button>

  <button class="more-row setup-link" @click="openTab('magicCatalog')">
    <span>
      <b>Objetos magicos</b>
    </span>
    <span aria-hidden="true">›</span>
  </button>

  <button class="more-row setup-link" @click="openTab('equipmentCatalog')">
    <span>
      <b>Objetos mundanos</b>
    </span>
    <span aria-hidden="true">›</span>
  </button>

  <button class="more-row setup-link" @click="openTab('rules')">
    <span>
      <b>AOO y Concentracion</b>
    </span>
    <span aria-hidden="true">›</span>
  </button>

  <button class="more-row setup-link" @click="openTab('skills')">
    <span>
      <b>Skills</b>
    </span>
    <span aria-hidden="true">›</span>
  </button>

  <button class="more-row setup-link" @click="openTab('umr')">
    <span>
      <b>Universal Monster Rules</b>
    </span>
    <span aria-hidden="true">›</span>
  </button>

  <button class="more-row setup-link" @click="openTab('grapple')">
    <span>
      <b>Grapple</b>
    </span>
    <span aria-hidden="true">›</span>
  </button>

  <button class="more-row setup-link" @click="openTab('conditions')">
    <span>
      <b>Condiciones</b>
    </span>
    <span aria-hidden="true">›</span>
  </button>

  <button class="more-row setup-link" @click="openTab('feats')">
    <span>
      <b>Feats</b>
    </span>
    <span aria-hidden="true">›</span>
  </button>

  <button class="more-row setup-link" @click="openTab('history')">
    <span>
      <b>Historico</b>
    </span>
    <span aria-hidden="true">›</span>
  </button>
</template>
