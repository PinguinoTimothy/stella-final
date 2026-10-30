<script setup>
// One inventory row. The right-hand side shows the single most useful quick action for that kind of item:
// charges stepper (wands…), quantity stepper (potions, scrolls, stacks) or an Equip button (gear).
// Tapping the left part opens the detail sheet.
import { computed } from "vue";
import { IGLYPH } from "../lib/constants";
import {
  curOf,
  isCharged,
  isStack,
  itemCat,
  maxOf,
  qtyOf,
} from "../lib/items";
import { useInventory } from "../stores/inventory";

const props = defineProps({
  item: { type: Object, required: true },
  hideOwner: Boolean,
  hideSlot: Boolean,
  hideEq: Boolean,
  readonly: { type: Boolean, default: false },
});
defineEmits(["open"]);
const inv = useInventory();

const it = computed(() => props.item);
const cur = computed(() => curOf(it.value));
const max = computed(() => maxOf(it.value));
const qty = computed(() => qtyOf(it.value));
const charged = computed(() => isCharged(it.value));
const stack = computed(() => isStack(it.value));
const spent = computed(() => charged.value && cur.value === 0);
const glyph = computed(() => IGLYPH[it.value.k] || IGLYPH._);
</script>

<template>
  <article
    class="item-card ic"
    :data-c="itemCat(it)"
  >
    <div class="ic-row">
      <button class="ic-main" @click="$emit('open', it)">
        <span class="ti" aria-hidden="true"
          ><svg viewBox="0 0 24 24" v-html="glyph" ></svg>
        </span>
        <span class="ic-tx">
          <span class="ic-t">
            <span
              >{{ it.n
              }}<small v-if="qty > 1 && !stack"> ×{{ qty }}</small></span
            >
            <span v-if="spent" class="tag warn">empty</span>
          </span>
          <span class="ic-m">
            <span v-if="!hideOwner" class="ic-o">{{
              it.owner || "Shared"
            }}</span>
            <span>{{ it.k || "Item" }}</span>
            <span v-if="it.slot && !hideSlot && it.slot !== it.k" class="tag">{{
              it.slot
            }}</span>
          </span>
          <span v-if="it.o" class="ic-n">{{ it.o }}</span>
        </span>
      </button>

      <span
        v-if="charged && !readonly"
        class="step ic-c"
        role="group"
        aria-label="Charges"
      >
        <button
          :disabled="cur <= 0"
          aria-label="Use one charge"
          @click="inv.useCharge(it, -1)"
        >
          −
        </button>
        <span
          ><b>{{ cur }}</b
          >/{{ max }}</span
        >
        <button
          :disabled="cur >= max"
          aria-label="Restore one charge"
          @click="inv.useCharge(it, 1)"
        >
          +
        </button>
      </span>
      <span
        v-else-if="stack && !readonly"
        class="step ic-c"
        role="group"
        aria-label="Quantity"
      >
        <button aria-label="Use one" @click="inv.adjustQty(it, -1)">−</button>
        <span
          ><b>{{ qty }}</b></span
        >
        <button aria-label="Add one" @click="inv.adjustQty(it, 1)">+</button>
      </span>

    </div>
  </article>
</template>
