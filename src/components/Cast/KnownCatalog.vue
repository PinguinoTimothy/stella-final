<script setup>
// Spontaneous casters: browse the catalog and add known spells, with the known-spells counter.
import { computed, nextTick, ref, watch } from 'vue'
import { knownCount, knownMax } from '../../lib/spellcasting'
import { useCast } from '../../stores/cast'
import { useCastCatalog } from '../../stores/castCatalog'
import CatalogSearch from './CatalogSearch.vue'

const props = defineProps({ level: { type: Number, required: true } })
const cast = useCast()
const catalog = useCastCatalog()
const c = computed(() => cast.characterClass)
const results = computed(() => catalog.catalogFor(c.value, props.level))
const max = computed(() => knownMax(c.value, props.level))

// A reload (new level, class or mode) starts at the top of the list.
const list = ref(null)
watch(() => catalog.scrollReset, async () => { await nextTick(); if (list.value) list.value.scrollTop = 0 })
</script>

<template>
  <div class="known-catalog">
    <div class="known-catalog-header">
      <div>
        <h3>Añadir conjuros conocidos</h3>
        <p>
          Conocidos: {{ knownCount(c, level) }}
          <template v-if="max !== null"> / {{ max }}</template>
        </p>
      </div>

      <div class="known-catalog-actions">
        <CatalogSearch v-model="catalog.search" />
        <button type="button" class="known-catalog-toggle" @click="catalog.showKnown = !catalog.showKnown">
          {{ catalog.showKnown ? 'Ocultar' : 'Mostrar' }} {{ catalog.showKnown ? '−' : '+' }}
        </button>
      </div>
    </div>

    <template v-if="catalog.showKnown">
      <p v-if="catalog.loading" class="mute">Cargando conjuros...</p>

      <div v-else ref="list" class="known-catalog-list">
        <div v-for="spell in results" :key="spell.n" class="known-catalog-row">
          <div class="known-catalog-info">
            <span class="known-catalog-name">{{ spell.n }}</span>
            <span v-if="spell.s" class="known-catalog-school">{{ spell.s }}</span>
          </div>
          <button type="button" class="known-catalog-add" @click="cast.addSpell(c, level, spell)">+</button>
        </div>

        <p v-if="!results.length" class="mute">No hay más conjuros disponibles.</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.known-catalog {
  margin: 16px 0;
  padding: 14px;
  border: 1px solid rgba(110, 160, 185, 0.22);
  border-radius: 15px;
  background: rgba(5, 15, 23, 0.28);
}
.known-catalog-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.known-catalog-header h3 { margin: 0; font-size: 1rem; }
.known-catalog-header p { margin: 4px 0 0; color: var(--mute, #91aab3); font-size: 0.82rem; }
.known-catalog-actions { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.known-catalog-toggle {
  padding: 7px 10px;
  border: 1px solid rgba(110, 160, 185, 0.25);
  border-radius: 8px;
  background: rgba(35, 105, 155, 0.15);
  color: #9bd5ff;
  font-size: 0.78rem;
  cursor: pointer;
}

.known-catalog-list { display: flex; flex-direction: column; gap: 5px; max-height: 280px; overflow-y: auto; padding-right: 4px; }
.known-catalog-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 42px;
  padding: 5px 7px 5px 11px;
  border: 1px solid rgba(110, 160, 185, 0.16);
  border-radius: 9px;
  background: rgba(20, 35, 45, 0.55);
  transition: background 0.15s, border-color 0.15s;
}
.known-catalog-row:hover { background: rgba(40, 65, 80, 0.65); border-color: rgba(100, 175, 220, 0.4); }
.known-catalog-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.known-catalog-name { font-size: 0.9rem; font-weight: 600; overflow-wrap: anywhere; }
.known-catalog-school { color: var(--mute, #91aab3); font-size: 0.72rem; }

.known-catalog-row > button.known-catalog-add {
  appearance: none;
  -webkit-appearance: none;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  width: 24px !important;
  min-width: 24px !important;
  max-width: 24px !important;
  height: 24px !important;
  min-height: 24px !important;
  max-height: 24px !important;
  flex: 0 0 24px !important;
  padding: 0 !important;
  margin: 0 !important;
  box-sizing: border-box;
  border: 1px solid rgba(90, 170, 225, 0.5);
  border-radius: 50%;
  background: rgba(35, 105, 155, 0.2);
  color: #9bd5ff;
  font-size: 15px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
}
.known-catalog-row > button.known-catalog-add:disabled { opacity: 0.3; cursor: not-allowed; }
</style>
