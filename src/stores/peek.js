// What the popup is showing: { kind: 'spell' | 'condition', name }. Only one popup at a time.
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const usePeek = defineStore('peek', () => {
  const current = ref(null);
  function open(kind, name) {
    if (name) current.value = { kind, name: String(name) };
  }
  function close() {
    current.value = null;
  }
  return { current, open, close };
});
