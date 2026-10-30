<script setup>
// Add / edit form (one component for both). `item` is the item being edited, or null to add a new one.
import { computed, reactive, ref } from 'vue'
import Sheet from './Sheet.vue'
import { CHARGED_KINDS, KINDS, SLOT_ORDER, SPELL_KINDS } from '../lib/constants'
import { newItem } from '../lib/items'
import { useAppStore } from '../stores/app'
import { useInventory } from '../stores/inventory'

const props = defineProps({ item: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])
const app = useAppStore(), inv = useInventory()

const editing = !!props.item
const defOwner = app.party.includes(app.ui.owner) ? app.ui.owner : ''
const f = reactive(editing ? { ...props.item } : newItem({ owner: defOwner }))
const adv = ref(false)
const showCharges = computed(() => CHARGED_KINDS.includes(f.k) || Number(f.max) > 0 || adv.value)
const showSpell = computed(() => SPELL_KINDS.includes(f.k) || !!f.spellName || adv.value)
const canAdv = computed(() => !showCharges.value || !showSpell.value)

function submit() {
  if (!String(f.n).trim()) return document.getElementById('f-name')?.focus()
  const ok = editing ? inv.update(props.item, f) : inv.add(f)
  if (ok) { emit('saved'); emit('close') }
}
</script>

<template>
  <Sheet :title="editing ? 'Edit item' : 'Add item'" @close="emit('close')">
    <form class="item-form" @submit.prevent="submit">
      <label>Name<input id="f-name" v-model="f.n" placeholder="Cloak of Resistance +1" autocomplete="off"></label>
      <div class="grid g2">
        <label>Type<select v-model="f.k"><option v-for="k in KINDS" :key="k">{{ k }}</option></select></label>
        <label>Quantity<input v-model.number="f.qty" type="number" min="1" step="1" inputmode="numeric"></label>
      </div>
      <label>Owner
        <select v-model="f.owner"><option value="">Unassigned</option><option v-for="n in app.party" :key="n" :value="n">{{ n }}</option></select>
      </label>

      <div v-if="showSpell" class="grid">
        <label>Spell<input v-model="f.spellName" placeholder="Spell name" autocomplete="off"></label>
        <div class="grid g2">
          <label>Caster level<input v-model.number="f.cl" type="number" min="1" inputmode="numeric"></label>
          <label>Spell level<input v-model.number="f.spellLevel" type="number" min="0" max="9" inputmode="numeric"></label>
        </div>
      </div>
      <div v-if="showCharges" class="grid g2">
        <label>Max charges<input v-model.number="f.max" type="number" min="0" inputmode="numeric" @change="f.cur = Math.min(Number(f.cur) || 0, Number(f.max) || 0)"></label>
        <label>Recovery<select v-model="f.recovery"><option value="none">Never</option><option value="rest">On rest</option></select></label>
        <label v-if="editing">Charges now<input v-model.number="f.cur" type="number" min="0" inputmode="numeric"></label>
      </div>
      <button v-if="canAdv" type="button" @click="adv = true">Add charges or a spell</button>

      <div class="grid g2">
        <label>Price each (gp)<input v-model.number="f.price" type="number" min="0" step="any" inputmode="decimal" placeholder="0"></label>
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
