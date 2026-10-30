<script setup>
// Prepare mode, classes that know every spell (wizard-like): search the catalog and add spells to the list.
import { computed } from 'vue'
import { useCast } from '../../stores/cast'
import { useCastCatalog } from '../../stores/castCatalog'
import CatalogSearch from './CatalogSearch.vue'

const props = defineProps({ level: { type: Number, required: true } })
const cast = useCast()
const catalog = useCastCatalog()
const results = computed(() => catalog.catalogFor(cast.characterClass, props.level))
</script>

<template>
  <div class="catalog">
    <CatalogSearch v-model="catalog.search" placeholder="Buscar conjuro..." />
    <div v-if="catalog.search.trim().length >= 2" class="catalog-results">
      <button v-for="spell in results" :key="spell.n" type="button" @click="cast.addSpell(cast.characterClass, level, spell)">
        <span>{{ spell.n }}</span>
        <span class="mute">Añadir +</span>
      </button>
      <p v-if="!results.length" class="mute">No hay resultados para esta búsqueda.</p>
    </div>
  </div>

  <p v-if="catalog.loading" class="mute">Cargando conjuros de este nivel...</p>
</template>
