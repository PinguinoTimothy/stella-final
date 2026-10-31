<script setup>
// Inventory screen. Same toolbar as the rest of the app; the items are listed by category as folding
// sections, one line per item. Tap an item for the detail sheet; the + button adds one.
import { computed, ref, watch } from 'vue'
import InventoryRow from '../components/Inventory/InventoryRow.vue'
import ItemDetail from '../components/ItemDetail.vue'
import ItemForm from '../components/ItemForm.vue'
import MoneyPanel from '../components/MoneyPanel.vue'
import { curOf, groupByCategory, inOwner, isCharged, isUse, qtyOf } from '../lib/items'
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

// Gold value of a list of items: price each × quantity. Items without a price count as 0.
const gpOf = (list) => Math.round(list.reduce((acc, it) => acc + (Number(it.price) || 0) * qtyOf(it), 0) * 100) / 100
const totalGp = computed(() => gpOf(scope.value))

const filtered = computed(() => {
  const q = ui.search.trim().toLowerCase()
  return scope.value.filter((it) => {
    if (ui.itemView === 'uses' && !isUse(it)) return false
    return !q || [it.n, it.k, it.slot, it.o, it.spellName, it.owner, it.aura].join(' ').toLowerCase().includes(q)
  })
})
const groups = computed(() => groupByCategory(filtered.value).map((g) => ({ ...g, gp: gpOf(g.items) })))
const detail = computed(() => items.value.find((it) => it.id === detailId.value) || null)
const emptyMsg = computed(() => {
  if (ui.search) return 'Nothing matches your search.'
  if (ui.itemView === 'uses') return 'No wands, scrolls, potions or charged items here.'
  return 'Nothing here yet.'
})
const countFor = (o) => items.value.filter((it) => inOwner(it, o)).length

// ---------- folding sections ----------
// Remembered in this browser. While searching every section is open, so no result is hidden.
const COLLAPSE_KEY = 'stella-inv-collapsed-v1'
function readCollapsed() {
  try {
    const list = JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}
const collapsed = ref(readCollapsed())
watch(collapsed, (list) => {
  try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(list)) } catch { /* storage off: lasts this session */ }
}, { deep: true })

const isCollapsed = (id) => !ui.search && collapsed.value.includes(id)
const allCollapsed = computed(() => groups.value.length > 0 && groups.value.every((g) => collapsed.value.includes(g.id)))

function toggle(id) {
  collapsed.value = collapsed.value.includes(id)
    ? collapsed.value.filter((x) => x !== id)
    : [...collapsed.value, id]
}
function toggleAll() {
  collapsed.value = allCollapsed.value ? [] : groups.value.map((g) => g.id)
}

// if the open item disappears (deleted, undo…), close its sheet
watch(detail, (d) => { if (!d) detailId.value = null })
function edit(it) {
  if (props.readonly) return
  detailId.value = null
  form.value = { item: it }
}
</script>

<template>
  <div class="inv-screen">
    <MoneyPanel :readonly="readonly" />

    <section class="panel items-toolbar">
      <p class="isum">
        <span><b>{{ scope.length }}</b>{{ scope.length === 1 ? 'item' : 'items' }}</span>
        <span v-if="nEmpty" class="warn"><b>{{ nEmpty }}</b>empty</span>
        <span v-if="totalGp" class="itotal" title="Value of these items: price × quantity"><b>{{ fmtNum(totalGp) }}</b>gp</span>
        <button v-if="groups.length > 1 && !ui.search" type="button" class="inv-fold-all" @click="toggleAll">
          {{ allCollapsed ? 'Expand all' : 'Collapse all' }}
        </button>
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
      <p v-if="!ui.search && ui.itemView === 'inventory' && !readonly" class="mute">Tap + to add an item.</p>
    </section>

    <template v-else>
      <section
        v-for="g in groups"
        :key="g.id"
        class="inv-sec"
        :class="{ folded: isCollapsed(g.id) }"
        :data-c="g.id"
      >
        <h3 class="inv-sec-h">
          <button type="button" class="inv-sec-toggle" :aria-expanded="!isCollapsed(g.id)" :aria-controls="`inv-${g.id}`" @click="toggle(g.id)">
            <span class="inv-chev" aria-hidden="true">▾</span>
            <span class="inv-sec-name">{{ g.label }}</span>
            <span class="inv-sec-count">{{ g.items.length }}</span>
            <span v-if="g.gp" class="inv-sec-gp">{{ fmtNum(g.gp) }} gp</span>
          </button>
        </h3>
        <div v-show="!isCollapsed(g.id)" :id="`inv-${g.id}`" class="inv-list">
          <InventoryRow
            v-for="it in g.items"
            :key="it.id"
            :item="it"
            :readonly="readonly"
            :hide-owner="ui.owner !== ''"
            @open="detailId = it.id"
          />
        </div>
      </section>
    </template>

    <button
      v-if="!readonly"
      class="fab"
      aria-label="Add item"
      @click="form = { item: null }"
    >+</button>

    <ItemDetail
      v-if="detail"
      :item="detail"
      :readonly="readonly"
      @close="detailId = null"
      @edit="edit"
    />
    <ItemForm
      v-if="form && !readonly"
      :item="form.item"
      @close="form = null"
    />
  </div>
</template>

<style scoped>
/* Category colors: the same ones the item cards use across the app. */
.inv-sec[data-c="gear"] { --tc: var(--warn); }
.inv-sec[data-c="worn"] { --tc: var(--dom); }
.inv-sec[data-c="charged"] { --tc: var(--acc); }
.inv-sec[data-c="use"] { --tc: var(--gold); }
.inv-sec[data-c="other"] { --tc: var(--mute); }

.inv-fold-all {
  margin-left: auto;
  min-height: 32px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 13px;
}

.inv-sec { margin-top: 14px; }
.inv-sec-h { margin: 0; }
.inv-sec-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 46px;
  padding: 6px 2px;
  background: none;
  border: 0;
  border-bottom: 2px solid var(--line);
  border-radius: 0;
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.inv-sec-toggle:focus-visible { outline: 2px solid var(--acc); outline-offset: 2px; }
.inv-chev {
  width: 1em;
  color: var(--tc);
  transition: transform .15s ease;
}
.inv-sec.folded .inv-chev { transform: rotate(-90deg); }
.inv-sec-name {
  font-family: var(--disp);
  font-size: 24px;
  line-height: 1;
  color: var(--tc);
}
.inv-sec-count {
  min-width: 24px;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--raise);
  color: var(--mute);
  font-size: 12px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.inv-sec-gp {
  margin-left: auto;
  font-size: 14px;
  color: var(--gold);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.inv-list { padding-top: 2px; }

@media (prefers-reduced-motion: reduce) {
  .inv-chev { transition: none; }
}
</style>
