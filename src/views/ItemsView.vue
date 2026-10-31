<script setup>
// Inventory screen: filters on top, then items grouped by category (or the per-slot loadout).
// Tap an item for the detail sheet; the + button adds one.
import { computed, ref, watch } from 'vue'
import ItemCard from '../components/ItemCard.vue'
import ItemDetail from '../components/ItemDetail.vue'
import ItemForm from '../components/ItemForm.vue'
import MoneyPanel from '../components/MoneyPanel.vue'
import { curOf, groupByCategory, inOwner, isCharged, isUse } from '../lib/items'
import { fmtNum } from '../lib/format'
import { useAppStore } from '../stores/app'

const app = useAppStore()
const ui = app.ui
const detailId = ref(null)           // item shown in the detail sheet
const form = ref(null)               // null = closed · { item: null } = add · { item } = edit
const props = defineProps({
  readonly: { type: Boolean, default: false }
})
const VIEWS = [['inventory', 'Inventario'], ['uses', 'Usables']]
const items = computed(() => app.S.items)
const chips = computed(() => [['', 'All'], ...app.party.map((n) => [n, n]), ['__none', 'Shared']])
const scope = computed(() => items.value.filter((it) => inOwner(it, ui.owner)))
const nEmpty = computed(() => scope.value.filter((it) => isCharged(it) && curOf(it) <= 0).length)
// Gold value of the items in the current owner filter: price each × quantity. Items without a price count as 0.
const totalGp = computed(() => {
  const sum = scope.value.reduce((acc, it) => acc + (Number(it.price) || 0) * Math.max(1, Number(it.qty) || 1), 0)
  return Math.round(sum * 100) / 100
})

const filtered = computed(() => {
  const q = ui.search.trim().toLowerCase()
  return scope.value.filter((it) => {
    if (ui.itemView === 'uses' && !isUse(it)) return false
    return !q || [it.n, it.k, it.slot, it.o, it.spellName, it.owner, it.aura].join(' ').toLowerCase().includes(q)
  })
})
const groups = computed(() => groupByCategory(filtered.value))
const detail = computed(() => items.value.find((it) => it.id === detailId.value) || null)
const emptyMsg = computed(() => {
  if (ui.search) return 'Nothing matches your search.'
  if (ui.itemView === 'uses') return 'No wands, scrolls, potions or charged items here.'
  return 'Nothing here yet.'
})
const countFor = (o) => items.value.filter((it) => inOwner(it, o)).length

// if the open item disappears (deleted, undo…), close its sheet
watch(detail, (d) => { if (!d) detailId.value = null })
function edit(it) {
  if (props.readonly) return
  detailId.value = null
  form.value = { item: it }
}</script>

<template>
    <MoneyPanel :readonly="readonly" />

  <section class="panel items-toolbar">
    <p class="isum">
      <span><b>{{ scope.length }}</b>{{ scope.length === 1 ? 'item' : 'items' }}</span>
      <span v-if="nEmpty" class="warn"><b>{{ nEmpty }}</b>empty</span>
      <span v-if="totalGp" class="itotal" title="Value of these items: price × quantity"><b>{{ fmtNum(totalGp) }}</b>gp</span>
    </p>
    <input v-model="ui.search" class="sr" placeholder="Buscar objetos..." aria-label="Search items">
    <div class="items-tabs">
      <button v-for="[id, label] in VIEWS" :key="id" :aria-pressed="ui.itemView === id" @click="ui.itemView = id">{{ label }}</button>
    </div>
    <div class="chips">
      <button v-for="[id, label] in chips" :key="id" class="chip" :aria-selected="ui.owner === id" @click="ui.owner = id">
        {{ label }} <span class="lv">{{ countFor(id) }}</span>
      </button>
    </div>
  </section>

  <section v-if="!filtered.length" class="panel item-empty">
    {{ emptyMsg }}
    <p v-if="!ui.search && ui.itemView === 'inventory'" class="mute">Tap + to add an item.</p>
  </section>

  <template v-else>
    <section v-for="g in groups" :key="g.id" class="ig">
      <h3 class="ig-h">{{ g.label }} <span>{{ g.items.length }}</span></h3>
      <div class="item-grid"><ItemCard :readonly="props.readonly" v-for="it in g.items" :key="it.id" :item="it" :hide-owner="ui.owner !== ''" @open="detailId = it.id" /></div>
    </section>
  </template>

<button
  v-if="!props.readonly"
  class="fab"
  aria-label="Add item"
  @click="form = { item: null }"
>+</button>
<ItemDetail
  v-if="detail"
  :item="detail"
  :readonly="props.readonly"
  @close="detailId = null"
  @edit="edit"
/><ItemForm
  v-if="form && !props.readonly"
  :item="form.item"
  @close="form = null"
/></template>
