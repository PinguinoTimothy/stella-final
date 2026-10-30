<script setup>
import { useAppStore } from '../stores/app'
const app = useAppStore()
</script>

<template>
  <div v-if="app.dialog" class="dlg-bd" data-t="arc" @click.self="app.dialog.done(false)">
    <form class="dlg" role="alertdialog" aria-modal="true" @submit.prevent="app.dialog.done(true)" @keydown.esc="app.dialog.done(false)">
      <h2>{{ app.dialog.title }}</h2>
      <p v-if="app.dialog.msg" class="mute">{{ app.dialog.msg }}</p>
      <div class="dlg-act">
        <button type="button" @click="app.dialog.done(false)">Cancel</button>
        <button type="submit" :class="app.dialog.danger ? 'dlg-danger' : 'cast'" autofocus>{{ app.dialog.ok || 'OK' }}</button>
      </div>
    </form>
  </div>
</template>
