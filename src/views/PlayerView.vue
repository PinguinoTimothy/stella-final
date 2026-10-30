<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app'
import ItemsView from './ItemsView.vue'

const app = useAppStore()
const S = computed(() => app.S)
const party = computed(() => app.party)

const money = computed(() => {
  const m = S.value.money || {}
  return [
    { label: 'PP', value: m.pp || 0 },
    { label: 'GP', value: m.gp || 0 },
    { label: 'SP', value: m.sp || 0 },
    { label: 'CP', value: m.cp || 0 }
  ]
})
</script>

<template>
  <main class="player-view">
    <header class="player-header">
      <div>
        <h1>{{ S.name || 'Partida' }}</h1>
        <p>Vista de jugador · Solo lectura</p>
      </div>
      <button type="button" @click="app.loadViewer()">
        Actualizar
      </button>
    </header>

    <p v-if="app.viewerStatus === 'idle' || app.viewerStatus === 'loading'">
      Cargando partida…
    </p>

    <p v-else-if="app.viewerStatus === 'error'">
      {{ app.viewerError }}
    </p>

    <template v-else>


<section class="player-inventory">
  <ItemsView :readonly="true" />
</section>



      <p v-if="app.viewerUpdatedAt">
        Última actualización: {{ new Date(app.viewerUpdatedAt).toLocaleString() }}
      </p>
    </template>
  </main>
</template>
