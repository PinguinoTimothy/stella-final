<script setup>
// Initiative tracker on the left, desktop only. Can be hidden to a tab; the choice is remembered in this browser.
import { computed, onUnmounted, ref, watch } from 'vue'
import { useAppStore } from '../../stores/app'
import { useMonsterFights } from '../../stores/monsterFights'
import { useInitiative } from '../../stores/initiative'

const app = useAppStore()
const fights = useMonsterFights()
const init = useInitiative()

const HIDE_KEY = 'stella-initiative-hidden-v1'
function readHidden() {
  try {
    return localStorage.getItem(HIDE_KEY) === '1'
  } catch {
    return false
  }
}
const hidden = ref(readHidden())
watch(hidden, (v) => {
  try {
    localStorage.setItem(HIDE_KEY, v ? '1' : '0')
  } catch {
    // Storage disabled: the choice only lasts for this session.
  }
})

const sidePanel = computed(() => !hidden.value)

// Keeps one entry per party member and per combat monster.
watch(
  () => [[...app.party], fights.fights.map((f) => f.name)],
  ([party, monsters]) => init.sync(party, monsters),
  { immediate: true, deep: true },
)

// The page reserves room for the rail only while it is visible (see the unscoped style below).
watch(sidePanel, (v) => document.body.classList.toggle('has-rail', v), { immediate: true })
onUnmounted(() => document.body.classList.remove('has-rail'))
</script>

<template>
  <aside v-if="sidePanel" class="init-rail" aria-label="Initiative">
    <header class="ir-head">
      <b>Initiative</b>
      <span class="mute">Round {{ init.round }}</span>
      <button class="ir-hide" type="button" aria-label="Hide initiative" @click="hidden = true">Hide</button>
    </header>

    <div class="ir-actions">
      <button class="cast" :disabled="!init.order.length" @click="init.next()">Next turn</button>
      <button :disabled="!init.currentKey && init.round === 1" @click="init.newRound()">New round</button>
    </div>

    <ol class="ir-list">
      <li
        v-for="e in init.ordered"
        :key="e.key"
        :class="{ current: e.key === init.currentKey && e.present, away: !e.present }"
      >
        <label class="ir-present" :title="e.present ? 'Present' : 'Absent'">
          <input type="checkbox" :checked="e.present" @change="init.setPresent(e.key, $event.target.checked)">
        </label>
        <span class="ir-kind" :class="e.kind">{{ e.kind === 'pc' ? 'PC' : 'Mon' }}</span>
        <span class="ir-name">{{ e.label }}</span>
        <input
          class="ir-init"
          type="number"
          inputmode="numeric"
          :value="e.init ?? ''"
          placeholder="—"
          aria-label="Initiative"
          @change="init.setInit(e.key, $event.target.value)"
        >
      </li>
    </ol>

    <p v-if="!init.entries.length" class="mute">
      Add characters in More → Party, and monsters to combat.
    </p>
  </aside>

  <!-- Hidden: a small tab on the left edge to bring the rail back. -->
  <button v-else class="ir-tab" type="button" aria-label="Show initiative" @click="hidden = false">
    Initiative
  </button>
</template>

<style scoped>
.init-rail {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 30;
  width: var(--rail-w, 260px);
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 12px;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--surface, #11222d);
  border-right: 1px solid var(--line, #264452);
}

.ir-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.ir-head b {
  flex: 1;
}

.ir-hide {
  min-height: 32px;
  padding: 0 10px;
}

.ir-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.ir-actions button {
  min-height: 40px;
  padding: 0 6px;
}

.ir-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}

.ir-list li {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) 56px;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: var(--raise, #172e3b);
}

.ir-list li.current {
  border-color: var(--acc, #a99bff);
}

.ir-list li.away {
  opacity: .5;
}

.ir-present input {
  width: 18px;
  height: 18px;
}

.ir-kind {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 6px;
  background: var(--spent, #2a4755);
}

.ir-kind.pc {
  color: var(--acc, #62bd91);
}

.ir-kind.mon {
  color: var(--warn, #ff8f86);
}

.ir-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ir-init {
  width: 56px;
  min-height: 34px;
  padding: 0 4px;
  text-align: center;
}

/* Hidden: a tab on the left edge. */
.ir-tab {
  position: fixed;
  z-index: 30;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  writing-mode: vertical-rl;
  min-height: 0;
  padding: 14px 8px;
  border: 1px solid var(--line, #264452);
  border-left: 0;
  border-radius: 0 12px 12px 0;
  background: var(--raise, #172e3b);
  color: inherit;
  font: inherit;
  font-weight: 700;
  letter-spacing: .04em;
  box-shadow: 6px 0 18px rgba(0, 0, 0, .25);
}

@media (max-width: 899px) {
  .init-rail,
  .ir-tab {
    display: none;
  }
}
</style>

<style>
/* Desktop: the page reserves room for the rail. Unscoped on purpose: it targets the page. */
:root {
  --rail-w: 260px;
}

@media (min-width: 900px) {
  body.has-rail {
    padding-left: var(--rail-w);
  }
}
</style>