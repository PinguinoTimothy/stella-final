<script setup>
// One chip per caster class. Hidden when there is only one.
import { useAppStore } from '../../stores/app'
import { useCast } from '../../stores/cast'

const app = useAppStore()
const cast = useCast()
</script>

<template>
  <section v-if="app.S.cl.length > 1" class="panel">
    <div class="chips">
      <button
        v-for="(c, index) in app.S.cl"
        :key="`${c.name}-${index}`"
        class="chip"
        :aria-selected="index === cast.classIndex"
        @click="cast.selectClass(index)"
      >
        {{ c.name || `Clase ${index + 1}` }}
        <span v-if="c.lvl" class="lv">{{ c.lvl }}</span>
      </button>
    </div>
  </section>
</template>
