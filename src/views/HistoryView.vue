<script setup>
// More › History: casts, item uses, money and rests, newest first (single-file version: vHistory).
import { computed } from 'vue'
import { useAppStore } from '../stores/app'
import { filterLog, groupByDay, HISTORY_SHOWN } from '../lib/history'
import BackButton from '../components/BackButton.vue'
import HistoryFilters from '../components/History/HistoryFilters.vue'
import HistoryEntry from '../components/History/HistoryEntry.vue'

const app = useAppStore()
const kind = computed({ get: () => app.ui.hf || '', set: (v) => { app.ui.hf = v } })
const list = computed(() => filterLog(app.S.log, kind.value))
const days = computed(() => groupByDay(list.value.slice(0, HISTORY_SHOWN)))

async function clear() {
  if (!(await app.ask({ title: 'Clear history?', msg: 'All entries will be deleted.', ok: 'Clear', danger: true }))) return
  app.snapshot()
  app.S.log = []
  app.notifyUndo('History cleared')
}
</script>

<template>
  <BackButton />
  <h2 class="pg">History</h2>
  <HistoryFilters v-model="kind" />

  <section v-if="!list.length" class="panel item-empty">
    Nothing here yet. Casts, item uses, money changes and rests are recorded as they happen.
  </section>

  <template v-else>
    <template v-for="g in days" :key="g.day">
      <h3 class="ig-h">{{ g.day }}</h3>
      <HistoryEntry v-for="(e, i) in g.entries" :key="e.t + ':' + i" :entry="e" />
    </template>
    <p class="mute">Showing the latest {{ Math.min(HISTORY_SHOWN, list.length) }} of {{ app.S.log.length }} (the app keeps the last 300).</p>
    <button v-if="!app.viewer" class="danger" @click="clear">Clear history</button>
  </template>
</template>
