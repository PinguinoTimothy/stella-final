<script setup>
// Combat panel: initiative order and monsters in ONE list, so you read turn, HP and the stat block in one place.
// Desktop: a column on the right (the page makes room for it). Phones/tablets: a button that opens a bottom sheet.
// Initiative, rounds and fights are kept in this browser (see the initiative and monsterFights stores).
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useAppStore } from '../../stores/app';
import { useMonsterFights } from '../../stores/monsterFights';
import { useInitiative } from '../../stores/initiative';
import StatWindows from './StatWindows.vue';
import { useStatWindows } from '../../stores/statWindows';
import { fetchMonsterPage } from '../../lib/monsters';

const app = useAppStore();
const fights = useMonsterFights();
const init = useInitiative();
const wins = useStatWindows();

// One initiative entry per party member and per monster in combat.
watch(
  () => [[...app.party], fights.fights.map(f => f.name)],
  ([party, monsters]) => init.sync(party, monsters),
  { immediate: true, deep: true },
);

/* ----- visibility ----- */
const HIDE_KEY = 'stella-combat-panel-hidden-v1';
function readHidden() {
  try {
    return localStorage.getItem(HIDE_KEY) === '1';
  } catch {
    return false;
  }
}
const hidden = ref(readHidden()); // desktop: collapsed to a small tab
watch(hidden, v => {
  try {
    localStorage.setItem(HIDE_KEY, v ? '1' : '0');
  } catch {
    // Storage disabled: the choice only lasts for this session.
  }
});
const sheet = ref(false); // phones: bottom sheet open

// The page reserves room for the panel only while it is visible (see the unscoped style below).
watch(
  () => !hidden.value,
  v => document.body.classList.toggle('has-combat', v),
  { immediate: true },
);
const onKey = e => {
  if (e.key === 'Escape' && wins.topUid() !== null) wins.close(wins.topUid());
};
onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => {
  document.body.classList.remove('has-combat');
  window.removeEventListener('keydown', onKey);
});

/* ----- the list ----- */
const monsterOf = e => (e && e.kind === 'mon' ? fights.fights.find(f => f.name === e.label) || null : null);
const rows = computed(() => init.ordered.map(e => ({ e, f: monsterOf(e) })));
const turnEntry = computed(() => init.order.find(e => e.key === init.currentKey) || null);
const isCurrent = e => e.present && e.key === init.currentKey;
const selectedUid = computed(() => fights.active?.uid ?? null);

const pct = f => (f.maxHp ? Math.max(0, Math.min(100, Math.round((100 * f.hp) / f.maxHp))) : 0);
const isDown = f => !f.loading && f.maxHp > 0 && f.hp <= 0;

// When the turn moves to a monster it becomes the target of the damage buttons, and the row scrolls into view.
const listEl = ref(null);
watch(
  () => init.currentKey,
  async key => {
    const f = monsterOf(init.entries.find(e => e.key === key));
    if (f) fights.show(f.uid);
    await nextTick();
    listEl.value?.querySelector('.cp-row.current')?.scrollIntoView?.({ block: 'nearest' });
  },
);

/* ----- stat blocks: one floating window per open monster (see stores/statWindows.js) ----- */
const isOpen = f => wins.isOpen(f.uid);
/** The (i) button: opens a window. On a window behind others it brings it to the front; on the top one it closes it. */
function toggleDetail(f) {
  fights.show(f.uid);
  if (!wins.isOpen(f.uid)) wins.open(f.uid);
  else if (wins.topUid() !== f.uid) wins.focus(f.uid);
  else wins.close(f.uid);
}
// A window goes away with its monster.
watch(
  () => fights.fights.map(f => f.uid),
  uids => wins.prune(uids),
);
/** The area the windows may use: the page, minus the combat column while it is docked on the right. */
function windowArea() {
  const docked = !hidden.value && window.innerWidth >= 900;
  const panel = docked ? document.querySelector('.cp')?.getBoundingClientRect().width || 0 : 0;
  return { left: 8, top: 8, right: window.innerWidth - panel - 8, bottom: window.innerHeight - 8 };
}

/* ----- damage / heal a custom amount on the selected monster ----- */
const amount = ref(5);
const amt = computed(() => Math.max(1, Math.abs(Math.round(Number(amount.value)) || 0)));
function applyToActive(sign) {
  if (fights.active) fights.change(fights.active.uid, sign * amt.value);
}

/* ----- adding creatures ----- */
const addQuery = ref('');
const addRows = ref([]);
const addBusy = ref(false);
let addTimer = 0;
watch(addQuery, q => {
  clearTimeout(addTimer);
  const term = q.trim();
  if (term.length < 2) {
    addRows.value = [];
    return;
  }
  addTimer = setTimeout(async () => {
    try {
      addRows.value = (await fetchMonsterPage({ query: term, limit: 8 })).rows;
    } catch {
      addRows.value = [];
    }
  }, 250);
});
async function addMonster(row) {
  addBusy.value = true;
  await fights.add(row.url, row.name);
  addBusy.value = false;
  addQuery.value = '';
  addRows.value = [];
}
const customName = ref('');
const customHp = ref(10);
function addCustomCreature() {
  if (!customName.value.trim() || !(Number(customHp.value) > 0)) return;
  fights.addCustom(customName.value, customHp.value);
  customName.value = '';
  customHp.value = 10;
}

async function clearAll() {
  const ok = await app.ask({
    title: 'Clear all fights?',
    msg: 'All open monsters and their HP will be removed.',
    ok: 'Clear',
    danger: true,
  });
  if (ok) fights.clearAll();
}
</script>

<template>
  <aside class="cp" :class="{ hidden, sheet }" aria-label="Combat">
    <header class="cp-head">
      <b>Combat</b>
      <span class="mute">Round {{ init.round }}</span>
      <button v-if="fights.fights.length" type="button" class="danger cp-small" @click="clearAll">Clear</button>
      <button type="button" class="cp-small cp-hide" aria-label="Hide combat" @click="hidden = true">Hide</button>
      <button type="button" class="cp-small cp-close" aria-label="Close combat" @click="sheet = false">Close</button>
    </header>

    <div class="cp-turn">
      <button type="button" class="cast cp-next" :disabled="!init.order.length" @click="init.next()">Next turn</button>
      <button
        type="button"
        class="cp-newround"
        :disabled="!init.currentKey && init.round === 1"
        @click="init.newRound()"
      >
        New round
      </button>
      <p class="cp-now">
        <template v-if="turnEntry"
          >Turn: <b>{{ turnEntry.label }}</b></template
        >
        <template v-else-if="init.order.length">Press Next turn to start.</template>
        <template v-else>Enter initiatives to set the turn order.</template>
      </p>
    </div>

    <div v-if="wins.list.length > 1" class="cp-wins">
      <span class="mute">{{ wins.list.length }} windows</span>
      <button type="button" class="cp-small" @click="wins.tile(windowArea())">Grid</button>
      <button type="button" class="cp-small" @click="wins.cascade(windowArea())">Cascade</button>
      <button type="button" class="cp-small" @click="wins.closeAll()">Close all</button>
    </div>
    <ol ref="listEl" class="cp-list">
      <li
        v-for="r in rows"
        :key="r.e.key"
        class="cp-row"
        :class="{
          current: isCurrent(r.e),
          away: !r.e.present,
          mon: r.e.kind === 'mon',
          down: r.f && isDown(r.f),
          sel: r.f && r.f.uid === selectedUid,
        }"
        @click="select(r)"
      >
        <div class="cp-main">
          <span class="cp-mark" aria-hidden="true">{{ isCurrent(r.e) ? '▶' : '' }}</span>
          <input
            class="cp-init"
            type="number"
            inputmode="numeric"
            placeholder="—"
            :value="r.e.init ?? ''"
            :aria-label="`Initiative of ${r.e.label}`"
            @change="init.setInit(r.e.key, $event.target.value)"
          />
          <span class="cp-name" :class="{ pc: !r.f }">{{ r.e.label }}</span>
          <span v-if="r.f" class="cp-hp"
            ><b>{{ r.f.hp }}</b
            >/{{ r.f.maxHp }}</span
          >
          <button
            v-if="r.f && r.f.url"
            type="button"
            class="cp-info"
            :class="{ on: isOpen(r.f) }"
            :aria-expanded="isOpen(r.f)"
            :aria-label="`Stat block of ${r.e.label}`"
            title="Stat block"
            @click.stop="toggleDetail(r.f)"
          >
            i
          </button>
          <span v-else class="cp-info"></span>
          <input
            class="cp-present"
            type="checkbox"
            :checked="r.e.present"
            :title="r.e.present ? 'Present' : 'Absent'"
            :aria-label="`${r.e.label} present`"
            @change="init.setPresent(r.e.key, $event.target.checked)"
          />
          <!-- Remove only shows on the selected monster, so it is not hit by accident. -->
          <button
            v-if="r.f && r.f.uid === selectedUid"
            type="button"
            class="cp-x"
            :aria-label="`Remove ${r.e.label} from combat`"
            @click.stop="fights.remove(r.f.uid)"
          >
            ×
          </button>
          <span v-else class="cp-x"></span>
        </div>

        <template v-if="r.f">
          <div class="cp-bar" aria-hidden="true">
            <i :class="{ low: pct(r.f) <= 25 }" :style="{ width: pct(r.f) + '%' }"></i>
          </div>

          <p v-if="r.f.loading" class="mute">Loading…</p>
          <p v-else-if="r.f.error" class="mute" role="alert">{{ r.f.error }}</p>
        </template>
      </li>
    </ol>

    <p v-if="!rows.length" class="mute cp-empty">Add characters in More → Party, and monsters below.</p>

    <div v-if="fights.fights.length" class="cp-amount">
      <input
        v-model.number="amount"
        type="number"
        min="1"
        inputmode="numeric"
        aria-label="Amount"
        @keydown.enter="applyToActive(-1)"
      />
      <button type="button" class="danger" :disabled="!fights.active" @click="applyToActive(-1)">Damage</button>
      <button type="button" class="cast" :disabled="!fights.active" @click="applyToActive(1)">Heal</button>
      <span v-if="fights.active" class="mute cp-target">→ {{ fights.active.name }}</span>
    </div>

    <details class="cp-add">
      <summary>+ Add monster</summary>
      <input v-model="addQuery" type="search" placeholder="Search the bestiary…" aria-label="Add a monster to combat" />
      <ul v-if="addRows.length" class="cp-add-list">
        <li v-for="row in addRows" :key="row.name + row.url">
          <button type="button" :disabled="addBusy" @click="addMonster(row)">
            <span>{{ row.name }}</span>
            <span class="mute">CR {{ row.cr }}</span>
          </button>
        </li>
      </ul>
      <div class="cp-custom">
        <input v-model="customName" type="text" placeholder="Not in the bestiary: name" aria-label="Creature name" />
        <input
          v-model.number="customHp"
          type="number"
          min="1"
          inputmode="numeric"
          placeholder="HP"
          aria-label="Creature HP"
        />
        <button type="button" class="cast" :disabled="!customName.trim() || !(customHp > 0)" @click="addCustomCreature">
          Add
        </button>
      </div>
    </details>
  </aside>

  <StatWindows />

  <!-- Desktop, hidden: a small tab on the right edge. -->
  <button v-if="hidden" type="button" class="cp-tab" aria-label="Show combat" @click="hidden = false">
    Combat
    <span v-if="fights.fights.length">{{ fights.fights.length }}</span>
  </button>

  <!-- Phones and tablets: a button that opens the panel as a bottom sheet. -->
  <template v-if="!sheet">
    <button type="button" class="cp-fab" aria-label="Open combat" @click="sheet = true">
      Combat
      <span v-if="fights.fights.length">{{ fights.fights.length }}</span>
      <small>R{{ init.round }}</small>
    </button>
  </template>
  <div v-else class="cp-back" aria-hidden="true" @click="sheet = false"></div>
</template>

<style scoped>
/* Desktop: floats over the page (the page never moves) and stops above the bottom navigation, which stays usable. */
.cp {
  position: fixed;
  top: 0;
  right: 0;
  bottom: calc(63px + env(safe-area-inset-bottom, 0px));
  z-index: 60;
  width: var(--combat-w, 380px);
  max-width: 100vw;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--surface, #11222d);
  border-left: 1px solid var(--line, #264452);
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.25);
}

.cp.hidden {
  display: none;
}

.cp-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 12px 12px 8px;
}

.cp-head b {
  flex: 1;
  font-size: 18px;
}

.cp-small {
  min-height: 34px;
  padding: 0 10px;
}
.cp-close {
  display: none;
}

.cp-turn {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 0 12px 8px;
}

.cp-turn button {
  min-height: 42px;
  padding: 0 6px;
}

.cp-now {
  grid-column: 1 / -1;
  margin: 2px 2px 0;
  font-size: 14px;
}

.cp-list {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 4px 12px 12px;
  list-style: none;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-content: start;
  gap: 6px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.cp-row {
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: var(--raise, #172e3b);
}

.cp-row.sel {
  border-color: var(--line, #264452);
}

.cp-row.current {
  border-color: var(--acc, #a99bff);
  background: color-mix(in srgb, var(--acc, #a99bff) 14%, var(--raise, #172e3b));
}

.cp-row.away {
  opacity: 0.5;
}

.cp-main {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cp-mark {
  width: 14px;
  flex: none;
  color: var(--acc, #a99bff);
  font-size: 12px;
  text-align: center;
}

.cp-init {
  width: 52px;
  flex: none;
  min-height: 34px;
  padding: 0 4px;
  text-align: center;
}

.cp-name {
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-weight: 700;
  text-align: left;
  /* Long names wrap onto more lines instead of being cut off. */
  overflow-wrap: anywhere;
}

.cp-name.pc {
  color: var(--acc, #62bd91);
}
.cp-row.down .cp-name {
  text-decoration: line-through;
  opacity: 0.6;
}

.cp-hp {
  flex: none;
  font-variant-numeric: tabular-nums;
}
.cp-hp b {
  font-size: 18px;
}

.cp-present {
  flex: none;
  width: 18px;
  height: 18px;
}

.cp-x {
  flex: none;
  width: 32px;
  min-width: 32px;
  min-height: 32px;
  padding: 0;
}
span.cp-x {
  visibility: hidden;
}

/* The stat block opens only from this button, never from tapping the row. Filled and glowing so it reads as a button. */
.cp-info {
  flex: none;
  width: 32px;
  min-width: 32px;
  height: 32px;
  min-height: 32px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--acc, #a99bff);
  color: var(--acc-ink, #120a33);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--acc, #a99bff) 28%, transparent);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 18px;
  font-style: italic;
  font-weight: 700;
  line-height: 1;
}
.cp-info:hover {
  filter: brightness(1.12);
}
.cp-info.on {
  background: var(--surface, #11222d);
  color: var(--acc, #a99bff);
  box-shadow: 0 0 0 2px var(--acc, #a99bff);
}
span.cp-info {
  visibility: hidden;
}

.cp-bar {
  height: 5px;
  margin: 6px 0 2px;
  border-radius: 4px;
  background: var(--spent, #2a4755);
  overflow: hidden;
}

.cp-bar i {
  display: block;
  height: 100%;
  background: var(--acc, #62bd91);
  transition: width 0.2s ease;
}
.cp-bar i.low {
  background: var(--warn, #ff8f86);
}

.cp-wins {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 12px 8px;
  font-size: 13px;
}
.cp-wins .mute {
  margin-right: auto;
}

.cp-empty {
  padding: 0 12px;
}

.cp-amount {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 12px;
  border-top: 1px solid var(--line, #264452);
}

.cp-amount input {
  width: 70px;
}
.cp-amount button {
  flex: 1;
  min-height: 40px;
}
.cp-target {
  flex-basis: 100%;
  font-size: 13px;
}

.cp-add {
  padding: 6px 12px 10px;
  border-top: 1px solid var(--line, #264452);
  font-size: 14px;
}
.cp-add summary {
  cursor: pointer;
  min-height: 36px;
  display: flex;
  align-items: center;
  color: var(--acc, #a99bff);
  font-weight: 700;
}
.cp-add input[type='search'],
.cp-custom input {
  min-height: 36px;
  border-radius: 10px;
  min-width: 0;
}
.cp-add input[type='search'] {
  width: 100%;
  margin-top: 4px;
}
.cp-custom {
  display: grid;
  grid-template-columns: 1fr 64px auto;
  gap: 6px;
  margin-top: 8px;
}

.cp-add-list {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  max-height: 200px;
  overflow-y: auto;
  display: grid;
  gap: 2px;
}
.cp-add-list button {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  min-height: 36px;
  padding: 4px 8px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
}
.cp-add-list button:hover,
.cp-add-list button:focus-visible {
  background: var(--raise, #172e3b);
  outline: none;
}

/* Desktop, hidden: a tab on the right edge. */
.cp-tab {
  position: fixed;
  z-index: 60;
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
  letter-spacing: 0.04em;
  box-shadow: -6px 0 18px rgba(0, 0, 0, 0.25);
}

.cp-tab span,
.cp-fab span {
  writing-mode: horizontal-tb;
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 10px;
  background: var(--acc, #a99bff);
  color: var(--acc-ink, #120a33);
  font-size: 12px;
  text-align: center;
}

.cp-fab,
.cp-back {
  display: none;
}

/* Phones and tablets: a floating button above the bottom navigation opens the panel as a sheet. */
@media (max-width: 899px) {
  .cp-tab {
    display: none;
  }

  .cp {
    display: none;
    top: auto;
    left: 0;
    right: 0;
    bottom: 0;
    width: auto;
    height: min(82vh, 680px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    border-left: 0;
    border-top: 1px solid var(--line, #264452);
    border-radius: 18px 18px 0 0;
  }

  .cp.sheet {
    display: flex;
  }
  .cp-hide {
    display: none;
  }
  .cp-close {
    display: inline-flex;
  }

  .cp-fab {
    position: fixed;
    z-index: 58;
    right: 12px;
    bottom: calc(76px + env(safe-area-inset-bottom, 0px));
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    padding: 0 14px;
    border: 1px solid var(--line, #264452);
    border-radius: 999px;
    background: var(--raise, #172e3b);
    color: inherit;
    font: inherit;
    font-weight: 700;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  }

  .cp-fab small {
    color: var(--mute, #9db4c0);
    font-weight: 400;
  }

  .cp-back {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 59;
    background: rgba(0, 0, 0, 0.45);
  }

}
</style>

<style>
/* Unscoped on purpose. The panel width, defined once (the search button uses it too). The page is not pushed aside. */
:root {
  --combat-w: clamp(320px, 30vw, 400px);
}
</style>
