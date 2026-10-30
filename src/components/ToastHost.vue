<script setup>
import { useAppStore } from '../stores/app'
const app = useAppStore()
const act = (fn) => { app.closeToast(); fn && fn() }
</script>

<template>
  <div v-if="app.toast" id="toast" role="status" aria-live="polite">
    <span>{{ app.toast.msg }}</span>
    <button v-if="app.toast.label" class="go" @click="act(app.toast.run)">{{ app.toast.label }}</button>
    <button v-if="app.toast.label2" @click="act(app.toast.run2)">{{ app.toast.label2 }}</button>
    <button class="tc" aria-label="Dismiss" @click="app.closeToast()">×</button>
  </div>
</template>
