<script setup>
// More › Grapple: step by step. Pick where you are in the grapple.
// Markup and class names are the original ones (h2.pg, .chips/.chip, article.cond, ul.grl).
import { computed, ref } from 'vue'
import { GRAPPLE_STEPS, GRAPPLE_VIEWS } from '../lib/grapple'
import BackButton from '../components/BackButton.vue'

const view = ref(GRAPPLE_VIEWS[0].id)
const steps = computed(() => GRAPPLE_STEPS[view.value] || [])
</script>

<template>
  <BackButton />
  <h2 class="pg">Grapple</h2>
  <p class="mute">A grapple check is a combat maneuver: d20 + CMB against the target’s CMD. Pick where you are in the grapple.</p>

  <div class="chips">
    <button
      v-for="v in GRAPPLE_VIEWS"
      :key="v.id"
      class="chip"
      type="button"
      :aria-selected="view === v.id"
      @click="view = v.id"
    >{{ v.label }}</button>
  </div>

  <div>
    <article v-for="step in steps" :key="step.title" class="cond">
      <b>{{ step.title }}</b>
      <ul class="grl">
        <li v-for="(point, i) in step.points" :key="i">{{ point }}</li>
      </ul>
    </article>
  </div>
</template>