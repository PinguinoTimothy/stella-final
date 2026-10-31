<script setup>
// One line of the inventory. The colored rule on the left is the category (same colors as the item cards).
// On the right: the value, and a charges stepper for wands and staves or a quantity stepper for stacks.
// Tap the name to open the details.
import { computed } from 'vue'
import { IGLYPH } from '../../lib/constants'
import { fmtNum } from '../../lib/format'
import { curOf, isCharged, isStack, itemCat, maxOf, qtyOf } from '../../lib/items'
import { useInventory } from '../../stores/inventory'

const props = defineProps({
  item: { type: Object, required: true },
  hideOwner: Boolean,
  readonly: { type: Boolean, default: false },
})
defineEmits(['open'])
const inv = useInventory()

const cur = computed(() => curOf(props.item))
const max = computed(() => maxOf(props.item))
const qty = computed(() => qtyOf(props.item))
const charged = computed(() => isCharged(props.item))
const stack = computed(() => isStack(props.item))
const spent = computed(() => charged.value && cur.value === 0)
const glyph = computed(() => IGLYPH[props.item.k] || IGLYPH._)
const value = computed(() => Math.round((Number(props.item.price) || 0) * qty.value * 100) / 100)
</script>

<template>
  <article class="inv-row" :class="{ spent }" :data-c="itemCat(item)">
    <button type="button" class="inv-main" @click="$emit('open', item)">
      <span class="inv-glyph" aria-hidden="true"><svg viewBox="0 0 24 24" v-html="glyph" /></span>
      <span class="inv-text">
        <span class="inv-name">{{ item.n }}<small v-if="qty > 1 && !stack"> ×{{ qty }}</small></span>
        <span class="inv-meta">
          <span v-if="!hideOwner">{{ item.owner || 'Shared' }}</span>
          <span>{{ item.k || 'Item' }}</span>
          <span v-if="item.slot && item.slot !== item.k">{{ item.slot }}</span>
          <span v-if="spent" class="inv-empty">empty</span>
        </span>
        <span v-if="item.o" class="inv-note">{{ item.o }}</span>
      </span>
    </button>

    <div class="inv-side">
      <span v-if="value" class="inv-value">{{ fmtNum(value) }} gp</span>
      <span v-if="!readonly && charged" class="step" role="group" aria-label="Charges">
        <button type="button" :disabled="cur <= 0" aria-label="Use one charge" @click="inv.useCharge(item, -1)">−</button>
        <span class="inv-count"><b>{{ cur }}</b>/{{ max }}</span>
        <button type="button" :disabled="cur >= max" aria-label="Restore one charge" @click="inv.useCharge(item, 1)">+</button>
      </span>
      <span v-else-if="!readonly && stack" class="step" role="group" aria-label="Quantity">
        <button type="button" aria-label="Use one" @click="inv.adjustQty(item, -1)">−</button>
        <span class="inv-count"><b>{{ qty }}</b></span>
        <button type="button" aria-label="Add one" @click="inv.adjustQty(item, 1)">+</button>
      </span>
    </div>
  </article>
</template>

<style scoped>
.inv-row {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 8px;
  padding-left: 12px;
  border-bottom: 1px solid var(--line);
}
.inv-row::before {
  content: "";
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 2px;
  background: var(--tc, var(--mute));
}
.inv-row.spent .inv-name { color: var(--mute); }

.inv-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 6px 12px 0;
  background: none;
  border: 0;
  border-radius: 0;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.inv-main:focus-visible { outline: 2px solid var(--acc); outline-offset: -2px; border-radius: 8px; }

.inv-glyph {
  flex: none;
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 14px 10px 15px 11px;
  color: var(--tc, var(--mute));
  background: color-mix(in srgb, var(--tc, var(--mute)) 14%, var(--raise));
  border: 1px solid color-mix(in srgb, var(--tc, var(--mute)) 50%, var(--line));
}
.inv-glyph svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.inv-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.inv-name { font-size: 17px; font-weight: 700; line-height: 1.25; color: var(--ink); }
.inv-name small { font-size: 14px; font-weight: 400; color: var(--mute); }
.inv-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 8px;
  font-size: 13px;
  color: var(--mute);
}
.inv-meta > span + span::before { content: "·"; margin-right: 8px; opacity: .6; }
.inv-empty { color: var(--warn); }
.inv-note {
  font-size: 13px;
  line-height: 1.4;
  color: var(--mute);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.inv-side {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 6px;
  padding: 10px 0;
}
.inv-value {
  font-size: 13px;
  color: var(--gold);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.inv-count {
  min-width: 44px;
  text-align: center;
  font-size: 14px;
  color: var(--mute);
  font-variant-numeric: tabular-nums;
}
.inv-count b { color: var(--ink); font-weight: 700; }
</style>
