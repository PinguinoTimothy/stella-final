<script setup>
// Add / edit form (one component for both). `item` is the item being edited, or null to add a new one.
import { computed, reactive, ref, watch } from 'vue'
import Sheet from './Sheet.vue'
import { CHARGED_KINDS, KINDS, SLOT_ORDER, SPELL_KINDS } from '../lib/constants'
import { newItem } from '../lib/items'
import { fetchSpellCatalogPage } from '../lib/supabase'
import { lowestSpellLevel } from '../lib/spellcasting'
import { useAppStore } from '../stores/app'
import { useInventory } from '../stores/inventory'
import { useSpells } from '../stores/spells'

const props = defineProps({ item: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])
const app = useAppStore(), inv = useInventory(), spells = useSpells()

const editing = !!props.item
const defOwner = app.party.includes(app.ui.owner) ? app.ui.owner : ''
const f = reactive(editing ? { ...props.item } : newItem({ owner: defOwner }))
const adv = ref(false)
const showCharges = computed(() => CHARGED_KINDS.includes(f.k) || Number(f.max) > 0 || adv.value)
const showSpell = computed(() => SPELL_KINDS.includes(f.k) || !!f.spellName || adv.value)
const canAdv = computed(() => !showCharges.value || !showSpell.value)

// Once the user has typed a value, a spell pick does not overwrite it. When editing, the saved values count as typed.
const touched = reactive({ name: editing, cl: editing, spellLevel: editing, max: editing, price: editing })

// Spell suggestions: searched on the server (the full spell list, not the 50 loaded at startup).
const suggestions = ref([])
const picked = ref(null)
let timer = 0, requestId = 0

watch(() => f.spellName, (value) => {
  const term = String(value || '').trim()
  clearTimeout(timer)
  if (term === picked.value) return
  picked.value = null
  if (term.length < 2) { suggestions.value = []; return }
  timer = setTimeout(() => search(term), 250)
})

async function search(term) {
  const id = ++requestId
  let rows = []
  try {
    rows = (await fetchSpellCatalogPage({ query: term, limit: 10 })).rows
  } catch {
    // Without the server, only the custom spells below are offered.
  }
  if (id !== requestId) return

  // Custom spells live in the character data, not in the catalog.
  const q = term.toLowerCase()
  const custom = (app.S.db || [])
    .filter((d) => String(d.n || '').toLowerCase().includes(q))
    .map((d) => ({ name: d.n, lv: d.lv || '' }))

  const seen = new Set()
  suggestions.value = [...custom, ...rows]
    .filter((s) => {
      const key = String(s.name || '').toLowerCase()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 10)
}

/** Base price of a wand: 750 gp × caster level × spell level (375 gp × caster level for 0-level spells). */
function wandPrice(cl, level) {
  const c = Number(cl) || 0, l = Number(level) || 0
  return l === 0 ? 375 * c : 750 * c * l
}

// Keeps the price in step with the wand's spell and caster level, until the user types a price.
watch(() => [f.k, f.spellName, f.cl, f.spellLevel], () => {
  if (f.k !== 'Wand' || !f.spellName || touched.price) return
  f.price = wandPrice(f.cl, f.spellLevel)
})

/** Chosen from the suggestions: loads the full spell and fills level, caster level and name when the user has not typed them. */
async function pick(name) {
  picked.value = name
  f.spellName = name
  suggestions.value = []

  await spells.ensure([name])
  const sp = spells.find(name)
  const lv = sp ? lowestSpellLevel(sp.lv) : null
  if (lv === null) return

  if (!touched.spellLevel) f.spellLevel = lv
  if (['Wand', 'Scroll', 'Potion'].includes(f.k)) {
    if (!touched.cl) f.cl = Math.max(1, lv * 2 - 1)
    const prefix = { Wand: 'Wand of ', Scroll: 'Scroll of ', Potion: 'Potion of ' }[f.k]
    if (!touched.name) f.n = prefix + sp.n
  }
  if (f.k === 'Wand' && !touched.max) {
    f.max = 50
    if (!editing) f.cur = 50
  }
}

function submit() {
  if (!String(f.n).trim()) return document.getElementById('f-name')?.focus()
  const ok = editing ? inv.update(props.item, f) : inv.add(f)
  if (ok) { emit('saved'); emit('close') }
}
</script>

<template>
  <Sheet :title="editing ? 'Edit item' : 'Add item'" @close="emit('close')">
    <form class="item-form" @submit.prevent="submit">
      <label>Name<input id="f-name" v-model="f.n" placeholder="Cloak of Resistance +1" autocomplete="off" @input="touched.name = true"></label>
      <div class="grid g2">
        <label>Type<select v-model="f.k"><option v-for="k in KINDS" :key="k">{{ k }}</option></select></label>
        <label>Quantity<input v-model.number="f.qty" type="number" min="1" step="1" inputmode="numeric"></label>
      </div>
      <label>Owner
        <select v-model="f.owner"><option value="">Unassigned</option><option v-for="n in app.party" :key="n" :value="n">{{ n }}</option></select>
      </label>

      <div v-if="showSpell" class="grid">
        <label>Spell<input v-model="f.spellName" placeholder="Search spell by name…" autocomplete="off"></label>
        <ul v-if="suggestions.length" class="spell-suggestions" role="listbox" aria-label="Matching spells">
          <li v-for="s in suggestions" :key="s.name">
            <button type="button" class="spell-option" role="option" @click="pick(s.name)">
              <span class="spell-option-name">{{ s.name }}</span>
              <span v-if="lowestSpellLevel(s.lv) !== null" class="spell-option-level">Lvl {{ lowestSpellLevel(s.lv) }}</span>
            </button>
          </li>
        </ul>
        <div class="grid g2">
          <label>Caster level<input v-model.number="f.cl" type="number" min="1" inputmode="numeric" @input="touched.cl = true"></label>
          <label>Spell level<input v-model.number="f.spellLevel" type="number" min="0" max="9" inputmode="numeric" @input="touched.spellLevel = true"></label>
        </div>
      </div>
      <div v-if="showCharges" class="grid g2">
        <label>Max charges<input v-model.number="f.max" type="number" min="0" inputmode="numeric" @input="touched.max = true" @change="f.cur = Math.min(Number(f.cur) || 0, Number(f.max) || 0)"></label>
        <label>Recovery<select v-model="f.recovery"><option value="none">Never</option><option value="rest">On rest</option></select></label>
        <label v-if="editing">Charges now<input v-model.number="f.cur" type="number" min="0" inputmode="numeric"></label>
      </div>
      <button v-if="canAdv" type="button" @click="adv = true">Add charges or a spell</button>

      <div class="grid g2">
        <label>Price each (gp)<input v-model.number="f.price" type="number" min="0" step="any" inputmode="decimal" placeholder="0" @input="touched.price = true"></label>
        <label>Weight each (lb)<input v-model.number="f.weight" type="number" min="0" step="any" inputmode="decimal" placeholder="0"></label>
      </div>
      <details>
        <summary>Aura and caster level</summary>
        <div class="grid g2" style="margin-top:10px">
          <label>Aura<input v-model="f.aura" placeholder="Moderate evocation"></label>
          <label>Caster level<input v-model.number="f.icl" type="number" min="0" inputmode="numeric" placeholder="0"></label>
        </div>
      </details>
      <label>Notes<textarea v-model="f.o" rows="3" placeholder="Bonus, properties, source…" /></label>
      <button class="cast" type="submit">{{ editing ? 'Save changes' : 'Add item' }}</button>
    </form>
  </Sheet>
</template>

<style scoped>
.spell-suggestions {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  max-height: 260px;
  overflow-y: auto;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
}
.spell-suggestions li + li { border-top: 1px solid var(--line); }
.spell-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  background: none;
  border: 0;
  border-radius: 0;
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.spell-option:hover, .spell-option:focus-visible { background: var(--raise); outline: none; }
.spell-option-name { font-weight: 600; }
.spell-option-level { color: var(--mute); font-size: 0.9em; white-space: nowrap; }
</style>
