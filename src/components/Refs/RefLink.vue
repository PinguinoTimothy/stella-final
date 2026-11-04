<script setup>
// A name that opens its popup when tapped.
import { usePeek } from '../../stores/peek';
const props = defineProps({
  kind: { type: String, required: true }, // 'spell' | 'condition'
  name: { type: String, required: true },
});
const peek = usePeek();
</script>

<template>
  <button type="button" class="ref-link" @click="peek.open(props.kind, props.name)">
    {{ name }}
  </button>
</template>

<style scoped>
.ref-link {
  display: inline;
  padding: 0;
  background: none;
  border: 0;
  border-bottom: 1px dotted currentColor;
  border-radius: 0;
  color: var(--acc, #a99bff);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.ref-link:focus-visible {
  outline: 2px solid var(--acc, #a99bff);
  outline-offset: 2px;
  border-radius: 4px;
}
</style>
