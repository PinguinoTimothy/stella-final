<script setup>
// The domain spell of a level: pick one of the domain's spells, read it, cast it with the domain slot.
// Independent from the class list and from preparation.
import { computed } from 'vue'
import { spellDC } from '../../lib/spellcasting'
import { useCast } from '../../stores/cast'
import { useCastCatalog } from '../../stores/castCatalog'
import SpellInfo from '../SpellInfo.vue'

const props = defineProps({ level: { type: Number, required: true } })
const cast = useCast()
const catalog = useCastCatalog()
const c = computed(() => cast.characterClass)
const candidates = computed(() => catalog.domainFor(props.level))
const selected = computed(() => catalog.selectedDomainSpell(c.value, props.level))
const isOpen = computed(() => cast.openDomainSpell === catalog.domainSpellKey(props.level, selected.value))
</script>

<template>
  <div class="detail domain-spell-panel" style="border-color: var(--dom)">
    <p class="mute">Conjuro de dominio · Nivel {{ level }}</p>

    <p v-if="catalog.isDomainLoading(level)" class="mute">Buscando conjuros de dominio...</p>
    <p v-else-if="!candidates.length" class="mute">No hay conjuros de dominio para este nivel.</p>

    <template v-else>
      <select :value="selected?.n || ''" aria-label="Conjuro de dominio" @change="catalog.selectDomainSpell(c, level, $event.target.value)">
        <option v-for="spell in candidates" :key="spell.n" :value="spell.n">
          {{ spell.n + (spell.domainName ? ' (' + spell.domainName + ')' : '') }}
        </option>
      </select>

      <div class="row">
        <button class="nm" :disabled="!selected" @click="catalog.toggleDomainSpell(level, selected)">
          {{ selected?.n }}
          <span class="tag dom">Dominio</span>
          <span class="mute">CD {{ spellDC(c, level, selected) }}</span>
        </button>

        <button class="cast" :disabled="!catalog.canCastDomain(c, level)" @click="catalog.castDomainSpell(c, level)">Lanzar</button>
      </div>

      <div v-if="isOpen" class="detail">
        <SpellInfo :spell="cast.fullSpell(selected)" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.domain-spell-panel > select { width: 100%; margin: 6px 0 10px; }
.domain-spell-panel > .detail { margin-top: 10px; }
</style>
