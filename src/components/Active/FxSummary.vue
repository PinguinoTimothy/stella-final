<script setup>
// Top panel of the Active screen: counters, "new round", time jumps, add form toggle.
import { computed } from 'vue'
import { useAppStore } from '../../stores/app'
import { useEffects } from '../../stores/effects'

defineProps({ adding: Boolean })
defineEmits(['toggleAdd'])

const app = useAppStore()
const fx = useEffects()
const total = computed(() => app.S.fx.length)
const ex = computed(() => fx.expired())
const run = computed(() => fx.running())
const status = computed(() => total.value ? (total.value - ex.value) + ' en curso' + (ex.value ? ', ' + ex.value + ' finalizados' : '') : '')
</script>

<template>
  <section class="panel">
    <div class="row">
      <h2>Hechizos activos</h2>
      <span class="mute">{{ status }}</span>
    </div>
    <button class="cast sr fx-tick" :disabled="!run" @click="fx.tick()">Nueva ronda</button>
    <div class="grid g3 fx-adv">
      <button :disabled="!run" @click="fx.skip(10)">+1 min</button>
      <button :disabled="!run" @click="fx.skip(100)">+10 min</button>
      <button :disabled="!run" @click="fx.skip(600)">+1 hora</button>
    </div>
    <div class="fxc fx-tools">
      <button @click="$emit('toggleAdd')">{{ adding ? 'Cerrar' : 'Nuevo hechizo' }}</button>
      <button v-if="ex" class="danger" @click="fx.clearExpired()">Clear expired</button>
    </div>
  </section>
</template>
