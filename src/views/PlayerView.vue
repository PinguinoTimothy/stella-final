<script setup>
import { useAppStore } from '../stores/app';
import ItemsView from './ItemsView.vue';

const app = useAppStore();
</script>

<template>
  <main class="player-view">
    <header class="player-header">
      <button type="button" @click="app.loadViewer()">Actualizar</button>
    </header>

    <p v-if="app.viewerStatus === 'idle' || app.viewerStatus === 'loading'">Cargando partida…</p>

    <p v-else-if="app.viewerStatus === 'error'">
      {{ app.viewerError }}
    </p>

    <template v-else>
      <section class="player-inventory">
        <ItemsView :readonly="true" />
      </section>

      <p v-if="app.viewerUpdatedAt">Última actualización: {{ new Date(app.viewerUpdatedAt).toLocaleString() }}</p>
    </template>
  </main>
</template>
<style lang="css" scoped>
.player-header {
  margin-bottom: 1rem;
}
</style>
