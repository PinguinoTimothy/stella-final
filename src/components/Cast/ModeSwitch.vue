<script setup>
// "Lanzar / Preparar" switch, only for prepared casters.
import { useCast } from '../../stores/cast'
const cast = useCast()
</script>

<template>
  <section v-if="cast.characterClass.type === 'prep'" class="panel">
    <div class="modebar">
      <span class="seg">
        <button :aria-pressed="!cast.prepareMode" @click="cast.setMode(false)">Lanzar</button>
        <button :aria-pressed="cast.prepareMode" @click="cast.setMode(true)">Preparar</button>
      </span>
    </div>
  </section>
</template>
