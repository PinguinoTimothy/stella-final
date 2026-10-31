<script setup lang="ts">
import { useAppStore } from '../stores/app'
import { useCloudStore } from '../stores/cloud'

const emit = defineEmits<{
  openInventory: []
  openCast: []
  openActive: []
  openSpells: []
  openMagicCatalog: []
}>()

const app = useAppStore()
const cloud = useCloudStore()

function openTab(tab: 'party' | 'setup' | 'magicCatalog' | 'skills' | 'umr' | 'grapple' | 'conditions' | 'history' | 'monsters') {
    if (app.viewer && tab === 'setup') return

  app.ui.tab = tab
  window.scrollTo(0, 0)
}
</script>

<template>
  <h2 class="pg">More</h2>

  <details v-if="!app.viewer" class="panel fold" data-k="share" open>
    <summary>Cloud save</summary>

    <div class="grid">
      <template v-if="cloud.session">
        <p class="mute" style="margin:0">
          Signed in as <b>{{ cloud.session.email }}</b>.
          Changes are saved to your database automatically;
          this device keeps a copy for offline use.
        </p>

        <div class="mute" role="status">
          {{ cloud.status }}
        </div>

        <template v-if="cloud.state === 'conflict'">
          <button class="cast" @click="cloud.pull()">
            Use the cloud version
          </button>

          <button class="danger" @click="cloud.force()">
            Keep this device’s version
          </button>
        </template>

        <button v-else class="cast" @click="cloud.sync()">
          Sync now
        </button>

        <button class="danger" @click="cloud.signOut()">
          Sign out
        </button>
      </template>

    </div>
  </details>

   <template v-if="!app.viewer">
    <h2 class="pg" style="font-size:22px;margin-top:18px">
      Character configuration
    </h2>

    <button class="more-row setup-link" @click="openTab('setup')">
      <span>
        <b>Setup</b>
        <small>
          Character, spellcasting classes, slots, domains and DC bonuses
        </small>
      </span>
      <span aria-hidden="true">›</span>
    </button>
  </template>

  <button class="more-row setup-link" @click="openTab('party')">
    <span>
      <b>Party</b>
      <small>Characters and who carries what.</small>
    </span>
    <span aria-hidden="true">›</span>
  </button>

  <button class="more-row setup-link" @click="openTab('magicCatalog')">
    <span>
      <b>Magic catalog</b>
      <small>Browse magic items and add them to inventory</small>
    </span>
    <span aria-hidden="true">›</span>
  </button>

  <button class="more-row setup-link" @click="openTab('skills')">
    <span>
      <b>Skills</b>
      <small>Quick DCs for every skill</small>
    </span>
    <span aria-hidden="true">›</span>
  </button>

  <button class="more-row setup-link" @click="openTab('umr')">
    <span>
      <b>Monster rules</b>
      <small>Universal monster rules, auras, traits and abilities</small>
    </span>
    <span aria-hidden="true">›</span>
  </button>
    <button class="more-row setup-link" @click="openTab('grapple')">
    <span>
      <b>Grapple</b>
      <small>Start, hold, escape and pin, step by step</small>
    </span>
    <span aria-hidden="true">›</span>
  </button>

  <button class="more-row setup-link" @click="openTab('conditions')">
    <span>
      <b>Conditions</b>
      <small>Rules reminders for blinded, shaken, fatigued…</small>
    </span>
    <span aria-hidden="true">›</span>
  </button>

  <button class="more-row setup-link" @click="openTab('history')">
    <span>
      <b>History</b>
      <small>Casts, item uses, money and rests</small>
    </span>
    <span aria-hidden="true">›</span>
  </button>

<button class="more-row setup-link" @click="openTab('monsters')">
      <span>
      <b>Monsters</b>
      <small>Bestiary: quick combat stats</small>
    </span>
    <span aria-hidden="true">›</span>
  </button>
</template>
