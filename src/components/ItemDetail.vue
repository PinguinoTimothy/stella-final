<script setup>
// Detail sheet: the full information plus big, thumb-friendly controls.
import { computed } from "vue";
import Sheet from "./Sheet.vue";
import { IGLYPH } from "../lib/constants";
import { fmtGp, fmtNum } from "../lib/format";
import {
  curOf,
  isCharged,
  isEquippable,
  isStack,
  maxOf,
  qtyOf,
} from "../lib/items";
import { useInventory } from "../stores/inventory";

const props = defineProps({
  item: { type: Object, required: true },
  readonly: { type: Boolean, default: false },
});
const emit = defineEmits(["close", "edit"]);
const inv = useInventory();
const it = computed(() => props.item);
const qty = computed(() => qtyOf(it.value));

const rows = computed(() => {
  const x = it.value,
    r = [];
  if (x.slot) r.push(["Slot", x.slot]);
  if (x.price)
    r.push([
      "Price",
      fmtGp(x.price) +
        (qty.value > 1 ? ` each, ${fmtGp(x.price * qty.value)} total` : ""),
    ]);
  if (x.weight)
    r.push([
      "Weight",
      fmtNum(x.weight) +
        " lb" +
        (qty.value > 1
          ? ` each, ${fmtNum(x.weight * qty.value)} lb total`
          : ""),
    ]);
  const cl = x.icl || (x.spellName ? x.cl : 0);
  if (x.aura || cl)
    r.push(["Aura", [x.aura, cl ? "CL " + cl : ""].filter(Boolean).join(", ")]);
  if (x.spellName)
    r.push(["Spell", x.spellName + (x.cl ? ` (CL ${x.cl})` : "")]);
  if (isCharged(x))
    r.push([
      "Recovery",
      (x.recovery || (x.daily ? "rest" : "none")) === "rest"
        ? "Recovers on rest"
        : "Does not recover on its own",
    ]);
  return r;
});

async function del() {
  if (await inv.remove(it.value)) emit("close");
}
function copy() {
  inv.duplicate(it.value);
  emit("close");
}
</script>

<template>
  <Sheet :title="it.n" @close="emit('close')">
    <div class="det-head">
      <span class="ti" aria-hidden="true">
        <svg viewBox="0 0 24 24" v-html="IGLYPH[it.k] || IGLYPH._"></svg>
      </span>
      <span class="ic-m">
        <span class="ic-o">{{ it.owner || "Shared" }}</span
        ><span>{{ it.k }}</span>
      </span>
    </div>

    <div v-if="isCharged(it) && !props.readonly" class="det-use">
      <span class="ic-l">Charges</span>
      <span class="step" role="group" aria-label="Charges">
        <button
          :disabled="curOf(it) <= 0"
          aria-label="Use one charge"
          @click="inv.useCharge(it, -1)"
        >
          −
        </button>
        <span class="ic-nn"
          ><b>{{ curOf(it) }}</b
          >/{{ maxOf(it) }}</span
        >
        <button
          :disabled="curOf(it) >= maxOf(it)"
          aria-label="Restore one charge"
          @click="inv.useCharge(it, 1)"
        >
          +
        </button>
      </span>
      <button v-if="curOf(it) < maxOf(it)" @click="inv.refill(it)">Full</button>
    </div>
    <div v-else-if="isStack(it) && !props.readonly" class="det-use">
      <span class="ic-l">Quantity</span>
      <span class="step" role="group" aria-label="Quantity">
        <button aria-label="Use one" @click="inv.adjustQty(it, -1)">−</button>
        <span class="ic-nn"
          ><b>{{ qty }}</b></span
        >
        <button aria-label="Add one" @click="inv.adjustQty(it, 1)">+</button>
      </span>
    </div>

    <dl v-if="rows.length" class="ic-d">
      <template v-for="[k, v] in rows" :key="k">
        <dt>{{ k }}</dt>
        <dd>{{ v }}</dd>
      </template>
    </dl>
    <div v-if="it.o" class="item-card-note">{{ it.o }}</div>

    <div v-if="!props.readonly" class="det-actions">
      <button @click="emit('edit', it)">Edit</button>
      <button @click="copy">Duplicate</button>
      <button class="danger" @click="del">Delete</button>
    </div>
  </Sheet>
</template>
