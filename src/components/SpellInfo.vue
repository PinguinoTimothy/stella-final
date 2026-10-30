<script setup>
// Spell facts block (school, cast, range, save, components…) + description + Archives of Nethys link.
// Shared by Active effects and, later, the Spells and Cast screens.
import { computed } from 'vue'
const props = defineProps({ spell: { type: Object, required: true } })

const join = (a) => a.filter(Boolean).join(' · ')
const lines = computed(() => {
  const s = props.spell
  return [
    join([s.s, s.tag]),
    join([s.ct && 'Cast: ' + s.ct, s.rng && 'Range: ' + s.rng, s.area && 'Area: ' + s.area, s.eff && 'Effect: ' + s.eff, s.tg && 'Targets: ' + s.tg, s.dur && 'Duration: ' + s.dur]),
    join([s.sv && 'Save: ' + s.sv, s.sr && 'SR: ' + s.sr]),
    join([s.comp && 'Components: ' + s.comp + (s.cost ? ' (' + s.cost + ')' : ''), s.src, s.deity && 'Deity: ' + s.deity, s.dom && 'Domain: ' + s.dom]),
  ].filter(Boolean)
})
const url = computed(() => 'https://aonprd.com/SpellDisplay.aspx?ItemName=' + encodeURIComponent(props.spell.n))
</script>

<template>
  <div class="mute"><template v-for="(l, i) in lines" :key="i"><br v-if="i">{{ l }}</template></div>
  <div>{{ spell.d }}</div>
  <a :href="url" target="_blank" rel="noopener">Open on Archives of Nethys</a>
</template>
