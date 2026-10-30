<script setup>
// Cast tab. The rules are in lib/spellcasting.js, the state and actions in stores/cast.js and stores/castCatalog.js,
// and every block of the screen is a component in components/Cast/.
import { computed } from 'vue'
import { useAppStore } from '../stores/app'
import { useCast } from '../stores/cast'
import { useCastCatalog } from '../stores/castCatalog'
import FxStrip from '../components/Active/FxStrip.vue'
import CastHeader from '../components/Cast/CastHeader.vue'
import ClassSummary from '../components/Cast/ClassSummary.vue'
import ClassTabs from '../components/Cast/ClassTabs.vue'
import LevelPanel from '../components/Cast/LevelPanel.vue'
import ModeSwitch from '../components/Cast/ModeSwitch.vue'

const app = useAppStore()
const cast = useCast()
useCastCatalog()   // starts loading the catalog and the domain spells

// First class: purple-pink. Second: blue.
const PALETTES = [
  { accent: '#d76bdc', soft: '#f09acb', glow: 'rgba(215,107,220,.20)' },
  { accent: '#58a6ff', soft: '#82c9ff', glow: 'rgba(88,166,255,.20)' },
]
const classTheme = computed(() => {
  const p = PALETTES[cast.classIndex % PALETTES.length]
  return { '--cast-accent': p.accent, '--cast-soft': p.soft, '--cast-glow': p.glow, '--acc': p.accent }
})
</script>

<template>
  <div v-if="!app.S.cl.length" class="panel">
    <h2>Aún no hay clases</h2>
    <p class="mute">Configura primero una clase lanzadora de conjuros en la sección Setup de la versión original.</p>
  </div>

  <div v-else-if="cast.characterClass" class="cast-view" :style="classTheme">
    <CastHeader />
    <ClassTabs />
    <ModeSwitch />
    <ClassSummary />
    <FxStrip />
    <LevelPanel v-for="level in cast.levelsToShow" :key="`${cast.classIndex}-${level}`" :level="level" />
    <button class="rest" @click="cast.rest()">Descansar y recuperar</button>
  </div>
</template>

<style scoped>
.cast-view {
  --cast-accent: #d76bdc;
  --cast-soft: #f09acb;
  --cast-glow: rgba(215, 107, 220, 0.2);
}

.cast-view :deep(.spell .nm:focus-visible),
.cast-view :deep(button:focus-visible) {
  outline: 2px solid var(--cast-accent);
  outline-offset: 2px;
}

/* Class, level and mode selectors: soft tones */
.cast-view :deep(.chip[aria-selected="true"]),
.cast-view :deep(.lvb[aria-selected="true"]),
.cast-view :deep(.modebar button[aria-pressed="true"]) {
  background: color-mix(in srgb, var(--cast-accent) 14%, #171321);
  border-color: var(--cast-accent);
  color: var(--cast-soft);
}

/* Idle buttons: subtle background, readable text */
.cast-view :deep(.chip),
.cast-view :deep(.lvb),
.cast-view :deep(.modebar button) {
  background: rgba(255, 255, 255, 0.035);
  color: var(--text, #e8e3ef);
  border-color: rgba(255, 255, 255, 0.12);
}

/* Keep the accent colour on the DC badge */
.cast-view :deep(.dcb b) {
  color: var(--cast-soft);
}
</style>
