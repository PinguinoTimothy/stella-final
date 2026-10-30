<script setup>
// One spell level: header, slots, domain spell, catalogs and the spell list.
import { computed } from 'vue'
import { preparedCount, slotInfo } from '../../lib/spellcasting'
import { useCast } from '../../stores/cast'
import DomainSpell from './DomainSpell.vue'
import KnownCatalog from './KnownCatalog.vue'
import LevelHeader from './LevelHeader.vue'
import PrepCatalog from './PrepCatalog.vue'
import SlotPips from './SlotPips.vue'
import SpellList from './SpellList.vue'

const props = defineProps({ level: { type: Number, required: true } })
const cast = useCast()
const c = computed(() => cast.characterClass)
const slots = computed(() => slotInfo(c.value, props.level))
</script>

<template>
  <section class="panel lvs">
    <template v-if="slots">
      <LevelHeader :level="level" />
      <SlotPips v-if="!slots.atWill" :level="level" />
      <DomainSpell v-if="c.dom && level >= 1 && !cast.prepareMode" :level="level" />

      <p v-if="c.type === 'prep' && !slots.atWill" class="mute note">
        Preparados: {{ preparedCount(c, level) }} de {{ slots.regular }} espacios normales.
      </p>

      <PrepCatalog v-if="cast.prepareMode && c.all" :level="level" />
      <KnownCatalog v-if="c.type === 'spont' && level === cast.selectedLevel" :level="level" />
      <SpellList :level="level" />
    </template>

    <template v-else>
      <h2>Nivel {{ level }}</h2>
      <p class="mute">No hay espacios disponibles para este nivel con la configuración actual.</p>
    </template>
  </section>
</template>
