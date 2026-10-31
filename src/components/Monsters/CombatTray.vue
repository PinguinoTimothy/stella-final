<script setup>
// Combat tray: the open fights. A fixed column on the right on desktop, a bottom drawer on phones.
// Can be hidden to a small tab; the choice is remembered in this browser. Also available in player mode.
import { computed, onUnmounted, ref, watch } from 'vue'
import { useAppStore } from '../../stores/app'
import { useMonsterFights } from '../../stores/monsterFights'
import CombatCard from './CombatCard.vue'

const app = useAppStore()
const fights = useMonsterFights()

const HIDE_KEY = 'stella-combat-hidden-v1'
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

const expanded = ref(false)   // phone drawer: closed by default
const amount = ref(5)
const amt = computed(() => Math.max(1, Math.abs(Math.round(Number(amount.value)) || 0)))

// Shown in both modes. Hidden means only the small tab is visible.
const sidePanel = computed(() => !hidden.value)
const readonly = computed(() => app.viewer)

const detailUid = ref(null)
const detail = computed(() => fights.fights.find((f) => f.uid === detailUid.value) || null)
watch(detail, (d) => { if (!d) detailUid.value = null })

const pct = (f) => (f.maxHp ? Math.max(0, Math.min(100, Math.round((100 * f.hp) / f.maxHp))) : 0)
const isDown = (f) => !f.loading && f.maxHp > 0 && f.hp <= 0

// The page reserves room for the panel only while it is visible (see the unscoped style below).
watch(sidePanel, (v) => document.body.classList.toggle('has-tray', v), { immediate: true })
onUnmounted(() => document.body.classList.remove('has-tray'))

function hide() {
  hidden.value = true
  expanded.value = false
  detailUid.value = null
}

function reveal() {
  hidden.value = false
}

function openDetail(uid) {
  fights.show(uid)
  detailUid.value = uid
}

function applyToActive(sign) {
  if (fights.active) fights.change(fights.active.uid, sign * amt.value)
}

async function clearAll() {
  const ok = await app.ask({
    title: 'Clear all fights?',
    msg: 'All open monsters and their HP will be removed.',
    ok: 'Clear',
    danger: true,
  })
  if (ok) fights.clearAll()
}
</script>

<template>
  <aside v-if="sidePanel" class="combat-tray" :class="{ open: expanded }" aria-label="Combat">
    <header class="ct-head">
      <button class="ct-toggle" type="button" :aria-expanded="expanded" @click="expanded = !expanded">
        <b>Combat</b>
        <span class="mute">{{ fights.fights.length ? `${fights.activeIndex + 1} / ${fights.fights.length}` : 'empty' }}</span>
      </button>
      <div class="ct-nav">
        <button :disabled="fights.fights.length < 2" aria-label="Previous monster" @click="fights.step(-1)">‹</button>
        <button :disabled="fights.fights.length < 2" aria-label="Next monster" @click="fights.step(1)">›</button>
        <button v-if="!readonly" :disabled="!fights.fights.length" class="danger" aria-label="Clear all" @click="clearAll">Clear</button>
        <button class="ct-hide" aria-label="Hide combat" @click="hide">Hide</button>
      </div>
    </header>

    <div v-if="!readonly" class="ct-amount">
      <input v-model.number="amount" type="number" min="1" inputmode="numeric" aria-label="Amount">
      <button class="danger" :disabled="!fights.active" @click="applyToActive(-1)">Damage</button>
      <button class="cast" :disabled="!fights.active" @click="applyToActive(1)">Heal</button>
    </div>

    <div class="ct-body">
      <p v-if="!fights.fights.length" class="mute">
        No open fights. Add monsters from More → Monsters.
      </p>

      <article
        v-for="f in fights.fights"
        :key="f.uid"
        class="ct-card"
        :class="{ active: f.uid === fights.active?.uid, down: isDown(f) }"
      >
        <div class="ct-row">
          <button class="ct-name" :aria-current="f.uid === fights.active?.uid" @click="openDetail(f.uid)">
            {{ f.name }}
          </button>
          <span v-if="isDown(f)" class="tag warn">down</span>
          <span class="ct-hp"><b>{{ f.hp }}</b>/{{ f.maxHp }}</span>
          <button v-if="!readonly" class="ct-x" aria-label="Remove from combat" @click="fights.remove(f.uid)">×</button>
        </div>

        <div class="ct-bar" aria-hidden="true"><i :style="{ width: pct(f) + '%' }"></i></div>

        <div v-if="!readonly" class="ct-btns">
          <button aria-label="Minus 5" @click="fights.change(f.uid, -5)">−5</button>
          <button aria-label="Minus 1" @click="fights.change(f.uid, -1)">−1</button>
          <button aria-label="Plus 1" @click="fights.change(f.uid, 1)">+1</button>
          <button aria-label="Plus 5" @click="fights.change(f.uid, 5)">+5</button>
          <button aria-label="Reset HP" @click="fights.reset(f.uid)">↺</button>
        </div>

        <p v-if="f.loading" class="mute">Loading…</p>
        <p v-else-if="f.error" class="mute" role="alert">{{ f.error }}</p>
      </article>
    </div>
  </aside>

  <!-- Hidden: a small tab to bring the panel back. -->
  <button v-else class="ct-tab" type="button" aria-label="Show combat" @click="reveal">
    Combat
    <span v-if="fights.fights.length">{{ fights.fights.length }}</span>
  </button>

  <!-- Popover with the full stat block. Clicking outside or × closes it. -->
  <template v-if="sidePanel && detail">
    <div class="ct-pop-bg" aria-hidden="true" @click="detailUid = null"></div>
    <section class="ct-pop" role="dialog" :aria-label="detail.name">
      <header class="ct-pop-head">
        <h2>{{ detail.name }}</h2>
        <span class="mute">HP {{ detail.hp }}/{{ detail.maxHp }}</span>
        <button class="x" aria-label="Close" @click="detailUid = null">×</button>
      </header>
      <div class="ct-pop-body">
        <p v-if="detail.loading" class="mute">Loading…</p>
        <p v-else-if="detail.error" class="mute" role="alert">{{ detail.error }}</p>
        <CombatCard v-else-if="detail.card" :card="detail.card" />
      </div>
    </section>
  </template>
</template>

<style scoped>
.combat-tray {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  width: var(--tray-w, 340px);
  display: flex;
  flex-direction: column;
  background: var(--surface, #11222d);
  border-left: 1px solid var(--line, #264452);
  box-shadow: -8px 0 24px rgba(0, 0, 0, .25);
}

.ct-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid var(--line, #264452);
}

.ct-toggle {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
}

.ct-nav {
  display: flex;
  gap: 6px;
}

.ct-nav button {
  min-width: 40px;
  min-height: 40px;
  padding: 0 8px;
}

.ct-amount {
  display: flex;
  gap: 6px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--line, #264452);
}

.ct-amount input {
  width: 76px;
}

.ct-amount button {
  flex: 1;
  min-height: 40px;
}

.ct-body {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 10px 12px 24px;
}

.ct-card {
  margin-bottom: 8px;
  padding: 10px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: var(--raise, #172e3b);
}

.ct-card.active {
  border-color: var(--acc, #a99bff);
}

.ct-card.down {
  opacity: .6;
}

.ct-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ct-name {
  flex: 1;
  min-width: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-weight: 700;
  text-align: left;
  text-decoration: underline dotted;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ct-hp {
  font-variant-numeric: tabular-nums;
}

.ct-hp b {
  font-size: 20px;
}

.ct-x {
  min-width: 36px;
  min-height: 36px;
  padding: 0;
}

.ct-bar {
  height: 6px;
  margin: 8px 0;
  border-radius: 4px;
  background: var(--spent, #2a4755);
  overflow: hidden;
}

.ct-bar i {
  display: block;
  height: 100%;
  background: var(--acc, #62bd91);
  transition: width .2s ease;
}

.ct-btns {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr)) 40px;
  gap: 6px;
}

.ct-btns button {
  min-height: 40px;
  padding: 0 4px;
}

/* Hidden: a tab on the right edge (on phones, above the bottom navigation). */
.ct-tab {
  position: fixed;
  z-index: 40;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  writing-mode: vertical-rl;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 0;
  padding: 14px 8px;
  border: 1px solid var(--line, #264452);
  border-right: 0;
  border-radius: 12px 0 0 12px;
  background: var(--raise, #172e3b);
  color: inherit;
  font: inherit;
  font-weight: 700;
  letter-spacing: .04em;
  box-shadow: -6px 0 18px rgba(0, 0, 0, .25);
}

.ct-tab span {
  writing-mode: horizontal-tb;
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 10px;
  background: var(--acc, #a99bff);
  color: var(--acc-ink, #120a33);
  font-size: 12px;
  text-align: center;
}

/* Popover with the stat block */
.ct-pop-bg {
  position: fixed;
  inset: 0;
  z-index: 45;
  background: transparent;
}

.ct-pop {
  position: fixed;
  z-index: 50;
  top: 72px;
  right: calc(var(--tray-w, 340px) + 12px);
  width: min(440px, calc(100vw - var(--tray-w, 340px) - 40px));
  max-height: calc(100vh - 96px);
  display: flex;
  flex-direction: column;
  background: var(--surface, #11222d);
  border: 1px solid var(--line, #264452);
  border-radius: 18px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, .4);
}

.ct-pop-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--line, #264452);
}

.ct-pop-head h2 {
  flex: 1;
  margin: 0;
  font-size: 22px;
}

.ct-pop-head .x {
  min-width: 36px;
  min-height: 36px;
}

.ct-pop-body {
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 12px 14px 18px;
}

/* Phones: a drawer above the bottom navigation. Collapsed it is only the header. */
@media (max-width: 899px) {
  .combat-tray {
    top: auto;
    left: 0;
    right: 0;
    bottom: var(--nav-h, 72px);
    width: auto;
    max-height: 56px;
    border-left: 0;
    border-top: 1px solid var(--line, #264452);
    border-radius: 18px 18px 0 0;
    transition: max-height .2s ease;
  }

  .combat-tray.open {
    max-height: 70vh;
  }

  .ct-amount,
  .ct-body {
    display: none;
  }

  .combat-tray.open .ct-amount {
    display: flex;
  }

  .combat-tray.open .ct-body {
    display: block;
  }

  .ct-tab {
    top: auto;
    right: 12px;
    bottom: calc(var(--nav-h, 72px) + 12px);
    transform: none;
    writing-mode: horizontal-tb;
    border: 1px solid var(--line, #264452);
    border-radius: 999px;
  }

  .ct-pop {
    top: auto;
    left: 8px;
    right: 8px;
    width: auto;
    bottom: calc(var(--nav-h, 72px) + 64px);
    max-height: 60vh;
  }
}
</style>

<style>
/* Unscoped on purpose: the body class is set by the tray and targets the page. */
@media (min-width: 900px) {
  body.has-tray {
    padding-right: var(--tray-w);
  }
}

@media (max-width: 899px) {
  body.has-tray #app {
    padding-bottom: 72px;
  }
}
</style>