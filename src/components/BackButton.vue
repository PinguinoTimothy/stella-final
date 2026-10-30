<script setup>
// "‹ More" button shown at the top of reference screens.
import { useAppStore } from '../stores/app'
const app = useAppStore()
const back = () => { app.ui.tab = 'more'; window.scrollTo(0, 0) }
</script>

<template>
  <button class="back" @click="back">‹ More</button>
</template>
