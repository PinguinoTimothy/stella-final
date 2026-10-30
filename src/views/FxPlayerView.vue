<script setup>
// Active tab in player mode (read only): chips per character, buffs and debuffs.
import { computed, ref } from 'vue'
import { useAppStore } from '../stores/app'
import { fxCmp, fxHit } from '../lib/effects'
import FxReadRow from '../components/Active/FxReadRow.vue'

const app = useAppStore()
const owner = ref('')
const count = (n) => n ? app.S.fx.filter((e) => fxHit(e, n)).length : app.S.fx.length
const list = computed(() => app.S.fx.filter((e) => !owner.value || fxHit(e, owner.value)))
const groups = computed(() => [['buff', 'Buffs'], ['debuff', 'Debuffs']].map(([k, title]) => ({ title, items: list.value.filter((e) => e.k === k).sort(fxCmp) })).filter((g) => g.items.length))
</script>

<template>
  <h2 class="pg">Active effects</h2>
  <div v-if="app.party.length" class="chips">
    <button v-for="n in ['', ...app.party]" :key="n" class="chip" :aria-selected="owner === n" @click="owner = n">
      {{ n || 'All' }} <span class="lv">{{ count(n) }}</span>
    </button>
  </div>
  <section v-for="g in groups" :key="g.title" class="panel flat">
    <h2>{{ g.title }}</h2>
    <FxReadRow v-for="e in g.items" :key="e.id" :effect="e" />
  </section>
  <section v-if="!list.length" class="panel item-empty">Nothing running{{ owner ? ' on ' + owner : '' }}.</section>
  <p class="mute">Times are as of the last update from the DM. They do not count down on their own.</p>
</template>
