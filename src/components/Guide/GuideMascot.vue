<script setup>
// The guide: a blue penguin that sits over the screen and offers a tip for the current tab,
// like the paperclip in Word. It greets each new screen, closes its bubble after a few seconds,
// and can be hidden for good from its bubble.
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { tipsFor } from '../../lib/guide'
import { useAppStore } from '../../stores/app'

const HIDE_KEY = 'stella-guide-hidden-v1'
const SHOW_MS = 8000

const app = useAppStore()
const hidden = ref(readHidden())
const open = ref(false)
const index = ref(0)
const tips = computed(() => tipsFor(app.ui.tab))
const tip = computed(() => tips.value[index.value % tips.value.length])
let timer = 0

function readHidden() {
  try { return localStorage.getItem(HIDE_KEY) === '1' } catch { return false }
}
function hideForGood() {
  hidden.value = true
  open.value = false
  try { localStorage.setItem(HIDE_KEY, '1') } catch { /* storage off: hidden for this session */ }
}

function showBubble() {
  clearTimeout(timer)
  open.value = true
  timer = setTimeout(() => (open.value = false), SHOW_MS)
}
// A new screen: start at its first tip and greet.
watch(() => app.ui.tab, () => {
  index.value = 0
  showBubble()
}, { immediate: true })

function toggle() {
  if (open.value) { clearTimeout(timer); open.value = false } else showBubble()
}
function next() {
  index.value = (index.value + 1) % tips.value.length
  showBubble()
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div v-if="!hidden" class="guide">
    <div v-if="open" class="guide-bubble" role="status" aria-live="polite">
      <p>{{ tip }}</p>
      <div class="guide-actions">
        <button v-if="tips.length > 1" type="button" class="guide-btn" @click="next">Next tip</button>
        <button type="button" class="guide-btn guide-quiet" @click="hideForGood">Hide guide</button>
      </div>
    </div>

    <button type="button" class="guide-pet" :aria-expanded="open" aria-label="Guide: show a tip" @click="toggle">
      <svg viewBox="0 0 120 150" aria-hidden="true">
        <!-- feet -->
        <ellipse cx="42" cy="138" rx="13" ry="7" fill="#f2c230" />
        <ellipse cx="78" cy="138" rx="13" ry="7" fill="#f2c230" />
        <!-- flippers -->
        <ellipse cx="22" cy="92" rx="9" ry="24" transform="rotate(-14 22 92)" fill="#8ea9c1" />
        <ellipse cx="98" cy="92" rx="9" ry="24" transform="rotate(14 98 92)" fill="#8ea9c1" />
        <!-- body -->
        <ellipse cx="60" cy="86" rx="41" ry="50" fill="#8ea9c1" />
        <!-- white belly -->
        <ellipse cx="60" cy="96" rx="28" ry="38" fill="#f5f7f8" />
        <!-- head -->
        <ellipse cx="60" cy="40" rx="37" ry="34" fill="#8ea9c1" />
        <!-- white face -->
        <ellipse cx="60" cy="52" rx="25" ry="20" fill="#f5f7f8" />
        <!-- closed, smiling eyes -->
        <path d="M41 44 q7 7 14 0" fill="none" stroke="#2f3d49" stroke-width="2.6" stroke-linecap="round" />
        <path d="M65 44 q7 7 14 0" fill="none" stroke="#2f3d49" stroke-width="2.6" stroke-linecap="round" />
        <!-- blush -->
        <circle cx="38" cy="56" r="4" fill="#f2a7a0" opacity="0.55" />
        <circle cx="82" cy="56" r="4" fill="#f2a7a0" opacity="0.55" />
        <!-- beak -->
        <path d="M46 54 Q60 47 74 54 Q60 67 46 54 Z" fill="#f2c230" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.guide {
  position: fixed;
  left: 12px;
  bottom: calc(84px + env(safe-area-inset-bottom, 0px));
  z-index: 40;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  max-width: calc(100vw - 24px);
}

.guide-pet {
  width: 72px;
  height: 90px;
  padding: 0;
  background: none;
  border: 0;
  border-radius: 0;
  cursor: pointer;
  animation: guide-bob 3.2s ease-in-out infinite;
}
.guide-pet:focus-visible { outline: 2px solid var(--acc); outline-offset: 4px; border-radius: 16px; }
.guide-pet svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 6px 10px rgba(0, 0, 0, .35));
}

.guide-bubble {
  max-width: 260px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
  color: var(--ink);
  font-size: 14px;
  line-height: 1.45;
  box-shadow: 0 8px 22px rgba(0, 0, 0, .3);
}
.guide-bubble p { margin: 0 0 8px; }
.guide-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.guide-btn {
  min-height: 32px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 13px;
}
.guide-quiet { color: var(--mute); }

@keyframes guide-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
@media (prefers-reduced-motion: reduce) {
  .guide-pet { animation: none; }
}

@media (min-width: 900px) {
  .guide { left: 20px; bottom: 20px; }
  /* the initiative rail takes the left side on desktop */
  :global(body.has-rail) .guide { left: calc(var(--rail-w, 260px) + 20px); }
}
</style>
