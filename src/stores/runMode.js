// The room view has two modes: Explore (the book, the map on request) and Combat (creatures on the left,
// the combat tracker wide on the right). Remembered in this browser.
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const KEY = 'stella-run-mode-v1'

function read() {
  try { return localStorage.getItem(KEY) === 'combat' ? 'combat' : 'explore' } catch { return 'explore' }
}

export const useRunMode = defineStore('runMode', () => {
  const mode = ref(read())
  watch(mode, (m) => { try { localStorage.setItem(KEY, m) } catch { /* storage off: lasts this session */ } })
  function set(m) { mode.value = m === 'combat' ? 'combat' : 'explore' }
  return { mode, set }
})
