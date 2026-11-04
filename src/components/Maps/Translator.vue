<script setup>
// Select text in the book and translate it. A small button appears over the selection;
// the translation opens in a panel at the bottom of the screen.
import { onBeforeUnmount, onMounted, ref, computed } from 'vue'
import { translate } from '../../lib/translate'

const props = defineProps({ root: { type: Object, default: null } })   // the element with the book pages

const LANGS = [['ES', 'Español'], ['EN-US', 'English'], ['FR', 'Français'], ['DE', 'Deutsch'], ['IT', 'Italiano'], ['PT-BR', 'Português']]
const text = ref('')
const pos = ref(null)                 // where the button sits, over the selection
const panel = ref(false)
const busy = ref(false)
const error = ref('')
const result = ref(null)
const target = ref('ES')
const copied = ref(false)

const buttonStyle = computed(() => {
  if (!pos.value) return {}
  const x = Math.min(Math.max(pos.value.x, 60), window.innerWidth - 60)
  return { left: x + 'px', top: Math.max(8, pos.value.y - 44) + 'px' }
})

function readSelection() {
  const sel = window.getSelection()
  const root = props.root
  if (!sel || sel.isCollapsed || !root || !sel.anchorNode || !root.contains(sel.anchorNode)) {
    if (!panel.value) pos.value = null
    return
  }
  const t = sel.toString().trim()
  if (t.length < 2) { if (!panel.value) pos.value = null; return }
  const r = sel.getRangeAt(0).getBoundingClientRect()
  text.value = t.slice(0, 1500)
  pos.value = { x: r.left + r.width / 2, y: r.top }
}

function onUp(e) {
  // a click on our own button must not clear the selection it belongs to
  if (e.target?.closest?.('.tr-root')) return
  setTimeout(readSelection, 0)
}

async function run() {
  panel.value = true
  pos.value = null
  busy.value = true
  error.value = ''
  result.value = null
  try {
    result.value = await translate(text.value, target.value)
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

async function changeLang(e) {
  target.value = e.target.value
  if (panel.value) await run()
}

async function copy() {
  if (!result.value) return
  try { await navigator.clipboard.writeText(result.value.text); copied.value = true; setTimeout(() => (copied.value = false), 1500) } catch { /* clipboard blocked */ }
}

/** Translates a passage directly, for a button placed on a read-aloud box. */
function translateText(t) {
  text.value = String(t || '').trim().slice(0, 1500)
  pos.value = null
  run()
}
defineExpose({ translateText })

function close() {
  panel.value = false
  result.value = null
  error.value = ''
}

onMounted(() => {
  document.addEventListener('mouseup', onUp)
  document.addEventListener('touchend', onUp)
})
onBeforeUnmount(() => {
  document.removeEventListener('mouseup', onUp)
  document.removeEventListener('touchend', onUp)
})
</script>

<template>
  <div class="tr-root">
    <button
      v-if="pos && !panel"
      type="button"
      class="tr-fab"
      :style="buttonStyle"
      @click="run"
    >
      Translate
    </button>

    <section
      v-if="panel"
      class="tr-panel"
      role="dialog"
      aria-label="Translation"
    >
      <header class="tr-head">
        <strong>Translation</strong>
        <select
          :value="target"
          aria-label="Target language"
          @change="changeLang"
        >
          <option
            v-for="[code, name] in LANGS"
            :key="code"
            :value="code"
          >
            {{ name }}
          </option>
        </select>
        <button
          type="button"
          class="tr-x"
          aria-label="Close translation"
          @click="close"
        >
          ×
        </button>
      </header>

      <p class="tr-original">
        {{ text }}
      </p>

      <p
        v-if="busy"
        class="tr-state"
      >
        Translating…
      </p>
      <p
        v-else-if="error"
        class="tr-error"
        role="alert"
      >
        {{ error }}
      </p>
      <p
        v-else-if="result"
        class="tr-result"
      >
        {{ result.text }}
      </p>

      <footer
        v-if="result"
        class="tr-foot"
      >
        <span
          v-if="result.source"
          class="tr-src"
        >From {{ result.source }}</span>
        <button
          type="button"
          class="tr-copy"
          @click="copy"
        >
          {{ copied ? 'Copied' : 'Copy' }}
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.tr-root { position: relative; z-index: 30; }
.tr-fab {
  position: fixed;
  transform: translateX(-50%);
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  border: 0;
  background: var(--acc);
  color: #111;
  font-weight: 700;
  font-size: 13px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, .4);
  cursor: pointer;
}
.tr-panel {
  position: fixed;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  width: min(580px, 92vw);
  max-height: 46vh;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: var(--surface);
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, .55);
  z-index: 40;
}
.tr-head { display: flex; align-items: center; gap: 8px; }
.tr-head strong { flex: 1; font-family: var(--disp); font-weight: 400; font-size: 18px; }
.tr-head select { min-height: 34px; border-radius: 9px; }
.tr-x { min-width: 34px; min-height: 34px; font-size: 18px; border-radius: 9px; cursor: pointer; }
.tr-original { margin: 0; max-height: 80px; overflow-y: auto; font-size: 12px; color: var(--mute); font-style: italic; }
.tr-result { margin: 0; font-size: 15px; line-height: 1.5; overflow-y: auto; }
.tr-state { margin: 0; color: var(--mute); }
.tr-error { margin: 0; color: var(--warn); }
.tr-foot { display: flex; align-items: center; gap: 10px; }
.tr-src { font-size: 12px; color: var(--mute); }
.tr-copy { margin-left: auto; min-height: 32px; padding: 0 12px; border-radius: 9px; font-size: 13px; cursor: pointer; }
</style>
