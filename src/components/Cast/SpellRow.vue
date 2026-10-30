<script setup>
// One spell: name and DC, then Cast / prepare stepper / "at will". Tap the name for the details.
import { computed } from 'vue'
import { canCast, canPrepare, slotInfo, spellDC } from '../../lib/spellcasting'
import { useCast } from '../../stores/cast'
import SpellInfo from '../SpellInfo.vue'

const props = defineProps({ level: { type: Number, required: true }, spell: { type: Object, required: true } })
const cast = useCast()
const c = computed(() => cast.characterClass)
const atWill = computed(() => !!slotInfo(c.value, props.level)?.atWill)
const open = computed(() => cast.openSpell === cast.spellKey(props.level, props.spell))
</script>

<template>
  <article class="spell sp">
    <div class="row">
      <button class="nm" @click="cast.toggleSpell(level, spell)">
        <span>{{ spell.n }}</span>
        <span class="sm"><span class="mute">CD {{ spellDC(c, level, spell) }}</span></span>
      </button>

      <span v-if="c.type === 'prep' && cast.prepareMode" class="step">
        <button :disabled="spell.dom || !spell.prep" aria-label="Preparar menos" @click="cast.changePreparation(c, level, spell, -1)">−</button>
        <b>{{ spell.prep || 0 }}</b>
        <button :disabled="spell.dom || !canPrepare(c, level)" aria-label="Preparar más" @click="cast.changePreparation(c, level, spell, 1)">+</button>
      </span>

      <span v-else-if="atWill" class="mute">A voluntad</span>

      <button v-else class="cast" :disabled="!canCast(c, level, spell)" @click="cast.castSpell(c, level, spell)">Lanzar</button>
    </div>

    <div v-if="open" class="detail">
      <SpellInfo :spell="cast.fullSpell(spell)" />

      <label class="grid">
        Notas
        <textarea :value="spell.note || ''" rows="2" placeholder="Notas del conjuro" @change="cast.saveNote(c, level, spell, $event)" />
      </label>

      <div class="row">
        <span>Modificador adicional de CD</span>
        <span class="step">
          <button aria-label="Bajar CD" @click="cast.changeSpellDC(c, spell, -1)">−</button>
          <b>{{ spell.dcb || 0 }}</b>
          <button aria-label="Subir CD" @click="cast.changeSpellDC(c, spell, 1)">+</button>
        </span>
      </div>

      <p v-if="c.type === 'prep'" class="mute">Copias restantes: {{ spell.left || 0 }} de {{ spell.prep || 0 }} preparadas.</p>

      <button v-if="!c.all" class="danger" @click="cast.removeSpell(c, level, spell)">Eliminar conjuro de este nivel</button>
    </div>
  </article>
</template>
