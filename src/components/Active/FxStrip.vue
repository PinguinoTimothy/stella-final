<script setup>
// Compact chip strip shown on the Cast screen: "Nueva ronda" plus one chip per effect. Tapping a chip opens Active.
import { computed } from 'vue'
import { useAppStore } from '../../stores/app'
import { useEffects } from '../../stores/effects'
import { fmtR, fxCmp, shR } from '../../lib/effects'

const app = useAppStore()
const fx = useEffects()
const sorted = computed(() => app.S.fx.slice().sort(fxCmp))
const open = () => { app.ui.tab = 'fx'; window.scrollTo(0, 0) }
</script>

<template>
  <div v-if="sorted.length" class="fxs">
    <button v-if="fx.running()" class="fc tk" @click="fx.tick()">Nueva ronda</button>
    <button v-for="e in sorted" :key="e.id" class="fc" :class="[e.k, { x: e.rem === 0 }]" :aria-label="e.n + ', ' + fmtR(e.rem)" @click="open">
      {{ e.n }} <b>{{ shR(e.rem) }}</b>
    </button>
  </div>
</template>
