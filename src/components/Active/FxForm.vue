<script setup>
// "Nuevo hechizo" form. Type a spell name to pick it from the database: kind, duration and self-target are filled in.
import { computed, reactive, ref, watch } from 'vue'
import SpellSuggestions from '../SpellSuggestions.vue'
import { useSpellSearch } from '../../composables/useSpellSearch'
import { useAppStore } from '../../stores/app'
import { useEffects } from '../../stores/effects'
import { useSpells } from '../../stores/spells'
import { kindOf, parseDur, selfOf } from '../../lib/effects'

const props = defineProps({ prefill: { type: Object, default: null } })
const emit = defineEmits(['done'])

const app = useAppStore()
const fx = useEffects()
const spells = useSpells()

const f = reactive({
  n: '', k: 'buff', ci: app.S.cl.length ? Math.min(app.ui.ci || 0, app.S.cl.length - 1) : 0,
  targets: [], tg: '', amount: '', unit: 'rd', extended: false, note: '', hint: '', ...(props.prefill && { n: props.prefill.n, ci: props.prefill.ci, unit: props.prefill.u, amount: props.prefill.a, k: props.prefill.k, tg: props.prefill.tg, hint: props.prefill.hint }),
})

// Suggestions from the database search. Once a spell is picked the list closes and the spell is kept for CL changes.
const finder = useSpellSearch()
const picked = ref(props.prefill ? props.prefill.n : null)
const pickedSpell = ref(null)
const suggestions = computed(() => (picked.value ? [] : finder.results.value))
const showNoMatch = computed(() => !picked.value && finder.done.value && !finder.results.value.length)
const targetOptions = computed(() => [{ v: 'Enemy', l: 'Enemigos', foe: true }, ...app.party.map((n) => ({ v: n, l: n }))])

function fill(d) {
  const k = app.S.cl[f.ci], cl = k ? (k.cl || 1) : 1, p = parseDur(d.dur, cl)
  f.n = d.n; picked.value = d.n; pickedSpell.value = d; f.k = kindOf(d)
  if (!f.tg) f.tg = selfOf(d)
  if (p && p.perm) { f.unit = 'perm'; f.amount = ''; f.hint = 'Lasts until you end it (' + d.dur + ').' }
  else if (p && p.dice) { f.unit = p.u; f.amount = ''; f.hint = 'Roll ' + p.dice + ' and enter the result.' }
  else if (p) { f.unit = p.u; f.amount = p.a; f.hint = 'Duration ' + d.dur + ' at CL ' + cl + '.' }
  else f.hint = 'Duration: ' + (d.dur || 'unknown') + '. Enter it by hand.'
}

watch(() => f.n, (v) => {
  if (picked.value && v !== picked.value) { picked.value = null; pickedSpell.value = null }
  if (!picked.value) finder.search(v)
})
watch(() => f.ci, () => {
  const d = pickedSpell.value || (picked.value && spells.find(picked.value))
  if (d) fill(d)
})

const nameEl = ref(null), amountEl = ref(null)
function submit() {
  if (!f.n.trim()) { nameEl.value && nameEl.value.focus(); return }
  if (f.unit !== 'perm' && !(+f.amount > 0)) { amountEl.value && amountEl.value.focus(); return }
  const k = app.S.cl[f.ci]
  fx.save({ ...f, cl: k ? (k.cl || 1) : 1 })
  emit('done')
}
</script>

<template>
  <section class="panel grid">
    <h2>Nuevo hechizo</h2>
    <input ref="nameEl" v-model="f.n" placeholder="Spell or effect name" autocomplete="off" aria-label="Effect name">
    <div>
      <SpellSuggestions :items="suggestions" meta="duration" @pick="fill" />
      <p v-if="showNoMatch" class="mute">No matching spells found.</p>
    </div>

    <div class="grid g2">
      <select v-model="f.k" aria-label="Type">
        <option value="buff">Buff</option>
        <option value="debuff">Debuff</option>
      </select>
    </div>

    <div class="detail">
      <strong>Objetivos</strong>
      <p class="mute">Selecciona uno o más</p>
      <label v-for="o in targetOptions" :key="o.v" class="row fx-target" :class="{ foe: o.foe }">
        <input v-model="f.targets" type="checkbox" :value="o.v">
        <span>{{ o.l }}</span>
      </label>
    </div>

    <label v-if="app.S.cl.length" class="mute">Caster level
      <select v-model.number="f.ci" class="sr">
        <option v-for="(k, i) in app.S.cl" :key="i" :value="i">{{ k.name }} (CL {{ k.cl || 1 }})</option>
      </select>
    </label>

    <div class="grid g2">
      <input ref="amountEl" v-model="f.amount" type="number" min="1" inputmode="numeric" placeholder="Duration" aria-label="Duration amount">
      <select v-model="f.unit" aria-label="Duration unit">
        <option value="rd">rounds</option>
        <option value="min">minutes</option>
        <option value="hr">hours</option>
        <option value="day">days</option>
        <option value="perm">until dismissed</option>
      </select>
    </div>
    <div class="mute">{{ f.hint }}</div>

    <label class="row"><span>Extended (duration ×2)</span><input v-model="f.extended" type="checkbox"></label>
    <input v-model="f.note" placeholder="Note (optional)" aria-label="Note">
    <button class="cast" @click="submit">Nuevo hechizo</button>
  </section>
</template>
