<script setup>
// The one popup for linked names. Mounted once in App.vue, so it opens above any screen.
// A spell shows its facts, then the items that use it: from the catalog, and from your own inventory.
import { computed, ref, watch } from 'vue'
import Sheet from '../Sheet.vue'
import SpellInfo from '../SpellInfo.vue'
import LinkedText from './LinkedText.vue'
import { conditionNamed, spellSlug } from '../../lib/refs'
import { fetchItemsUsingSpell } from '../../lib/supabase'
import { fmtGp } from '../../lib/format'
import { usePeek } from '../../stores/peek'
import { useAppStore } from '../../stores/app'
import { useSpells } from '../../stores/spells'

const peek = usePeek()
const app = useAppStore()
const spells = useSpells()
const spell = ref(null)
const loading = ref(false)
const catalogItems = ref([])
const usesLoading = ref(false)
let usesRequest = 0

const condition = computed(() => (peek.current?.kind === 'condition' ? conditionNamed(peek.current.name) : null))

// Your own items that carry this spell (the spell name is stored on the item).
const ownItems = computed(() => {
  if (!spell.value) return []
  const key = spell.value.n.toLowerCase()
  return (app.S.items || []).filter((it) => String(it.spellName || '').toLowerCase() === key)
})

async function loadUses(name) {
  const req = ++usesRequest
  usesLoading.value = true
  catalogItems.value = []
  try {
    const list = await fetchItemsUsingSpell(spellSlug(name))
    if (req === usesRequest) catalogItems.value = list
  } catch {
    if (req === usesRequest) catalogItems.value = []
  } finally {
    if (req === usesRequest) usesLoading.value = false
  }
}

watch(() => peek.current, async (cur) => {
  spell.value = null
  catalogItems.value = []
  usesRequest++
  if (!cur || cur.kind !== 'spell') return
  loading.value = true
  await spells.ensure([cur.name])
  const sp = spells.find(cur.name)
  spell.value = sp && !sp.miss ? sp : null
  loading.value = false
  if (spell.value) loadUses(spell.value.n)
})
</script>

<template>
  <Sheet v-if="peek.current" class="peek-sheet" :title="peek.current.name" @close="peek.close()">
    <template v-if="peek.current.kind === 'condition'">
      <p v-if="condition"><LinkedText :text="condition.text" /></p>
      <p v-else class="mute">No entry for this condition.</p>
    </template>
    <p v-else-if="loading" class="mute">Loading…</p>
    <template v-else-if="spell">
      <SpellInfo :spell="spell" />

      <section class="peek-uses">
        <h3>Used by</h3>
        <p v-if="ownItems.length"><b>In your inventory:</b> {{ ownItems.map((i) => i.n).join(', ') }}</p>
        <p v-if="usesLoading" class="mute">Looking up catalog items…</p>
        <template v-else-if="catalogItems.length">
          <p><b>Catalog items:</b></p>
          <ul class="peek-list">
            <li v-for="it in catalogItems" :key="it.id">
              {{ it.name }}<span class="mute"> · {{ it.category || 'Equipment' }}<template v-if="it.price_gp != null"> · {{ fmtGp(it.price_gp) }}</template></span>
            </li>
          </ul>
        </template>
        <p v-else-if="!ownItems.length" class="mute">No items use this spell.</p>
      </section>
    </template>
    <p v-else class="mute">Not found in the spell database.</p>
  </Sheet>
</template>

<style scoped>
/* Above every other layer: the monster stat block is 60, the tray 50, the sheets 20. */
.peek-sheet {
  z-index: 70;
}
.peek-uses {
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}
.peek-uses h3 {
  margin: 0 0 6px;
  font-family: var(--disp);
  font-size: 20px;
  font-weight: 400;
}
.peek-uses p { margin: 4px 0; }
.peek-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 3px;
}
</style>
