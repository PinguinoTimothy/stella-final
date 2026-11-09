<script setup>
// More › Slayer calculator: load a fillable character sheet (PDF) and work out attack, damage and skill bonuses
// against a target. The sheet is kept on this device only.
import { computed, reactive, ref, watch } from 'vue';
import { readSheet } from '../lib/sheetFields';
import { readFormFields } from '../lib/sheetPdf';
import { calcWeapon, dcBonus, skillBonus, studiedTargetSlots } from '../lib/slayer';
import { attackModes } from '../lib/attacks';

const KEY = 'pf1e-slayer-sheet-v1';
const EFFECTS_KEY = 'pf1e-slayer-effects-v1';
const KINDS = [
  { value: 'attack', label: 'Attack' },
  { value: 'damage', label: 'Damage' },
  { value: 'skill', label: 'Skills' },
  { value: 'dc', label: 'DCs' },
];

// Buffs and debuffs. Each has a name, the kind of roll it changes, a value (negative for a debuff) and an on switch.
function loadEffects() {
  try {
    const v = JSON.parse(localStorage.getItem(EFFECTS_KEY) || '[]');
    return Array.isArray(v) ? v.filter(e => e && KINDS.some(k => k.value === e.kind)) : [];
  } catch {
    return [];
  }
}
const effects = ref(loadEffects());
watch(
  effects,
  v => {
    try {
      localStorage.setItem(EFFECTS_KEY, JSON.stringify(v));
    } catch {
      // Storage full or disabled: the list still works until the page is closed.
    }
  },
  { deep: true },
);
const draft = reactive({ name: '', kind: 'attack', value: '' });
function addEffect() {
  const value = Number(draft.value);
  if (!draft.name.trim() || !Number.isFinite(value) || value === 0) return;
  effects.value.push({ id: Date.now() + Math.random(), name: draft.name.trim(), kind: draft.kind, value, on: true });
  draft.name = '';
  draft.value = '';
}
function removeEffect(id) {
  effects.value = effects.value.filter(e => e.id !== id);
}

function loadSaved() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
}

const sheet = ref(loadSaved());
const loading = ref(false);
const error = ref('');
const fieldCount = ref(0); // how many filled fields the last PDF gave, shown to help check a sheet

watch(sheet, v => {
  try {
    if (v) localStorage.setItem(KEY, JSON.stringify(v));
    else localStorage.removeItem(KEY);
  } catch {
    // Storage full or disabled: the sheet still works until the page is closed.
  }
});

async function onFile(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  loading.value = true;
  error.value = '';
  try {
    const fields = await readFormFields(file);
    fieldCount.value = Object.keys(fields).length;
    if (!fieldCount.value) {
      error.value = 'This PDF has no filled-in form fields, so it cannot be read.';
      return;
    }
    const s = readSheet(fields);
    if (!s.slayerLevel) {
      error.value = 'No Slayer class found on this sheet.';
      return;
    }
    sheet.value = s;
    // Lastwall Defender found in the sheet notes starts switched on; the switch can still be changed.
    options.lastwall = s.hasLastwall;
    // Point Blank Shot found in the sheet notes starts switched on for this fight.
    options.pointBlank = s.hasPointBlank;
  } catch {
    error.value = 'Could not read this PDF.';
  } finally {
    loading.value = false;
  }
}

// What is happening in this fight. Not saved: each fight starts clean.
const options = reactive({
  studied: true,
  undead: false,
  sneak: false,
  lastwall: false,
  reduced: 0,
  pointBlank: false,
  focus: { attack: false, damage: false, skill: false, dc: false },
});

const level = computed(() => sheet.value?.slayerLevel || 0);
const slots = computed(() => studiedTargetSlots(level.value));
const hasFocusFeat = computed(() => sheet.value?.hasLegalFocusedTarget || options.reduced > 0);

// One pick per target given up: a category stays open only while there are picks left.
const focusPicked = computed(() => Object.values(options.focus).filter(Boolean).length);
const focusLocked = key => !options.focus[key] && focusPicked.value >= (Number(options.reduced) || 0);
watch(
  () => options.reduced,
  n => {
    const limit = Number(n) || 0;
    let kept = 0;
    for (const key of Object.keys(options.focus)) {
      if (!options.focus[key]) continue;
      if (kept < limit) kept += 1;
      else options.focus[key] = false;
    }
  },
);

const calc = computed(() => {
  if (!sheet.value) return [];
  const common = {
    level: level.value,
    studied: options.studied,
    undead: options.undead,
    // Seething Hatred needs no switch: it applies by itself to a studied undead target when the sheet has the feat.
    seethingHatred: !!sheet.value.hasSeethingHatred,
    lastwall: options.lastwall,
    sneak: options.sneak,
    focus: options.focus,
    reduced: options.reduced,
  };
  return sheet.value.weapons.map(w => {
    const ranged = Number(w.range) > 0;
    const pointBlank = ranged && options.pointBlank;
    // Point Blank Shot's +1 damage goes in as a damage effect; its +1 attack is added by attackModes.
    const pbDamage = pointBlank ? [{ name: 'Point Blank Shot', kind: 'damage', value: 1, on: true }] : [];
    const base = calcWeapon(w, { ...common, effects: [...effects.value, ...pbDamage] });

    // Attack bonus = base attack bonus + ability modifier + everything the calculator adds (studied, buffs…).
    // The sheet's own attack number is not used, because it is already a list of attacks.
    const abilityMod = (ranged ? sheet.value.abilities.DEX?.mod : sheet.value.abilities.STR?.mod) ?? 0;
    const extras = base.attackParts
      .filter(p => p.label !== 'Sheet attack')
      .reduce((sum, p) => sum + (Number(p.value) || 0), 0);
    const modes = attackModes({
      bab: sheet.value.bab,
      mod: abilityMod + extras,
      ranged,
      // Rapid Shot and Manyshot come from the sheet's notes: they open attack options, not switches.
      rapidShot: !!sheet.value.hasRapidShot,
      manyShot: !!sheet.value.hasManyShot,
      pointBlank,
    });
    const pb = pointBlank ? ' · Point Blank +1' : '';
    const other = extras ? ` · other ${signed(extras)}` : '';
    return {
      name: w.name,
      modes,
      damage: base.damage,
      critical: base.critical,
      breakdown: `BAB ${signed(sheet.value.bab)} · ${ranged ? 'Dex' : 'Str'} ${signed(abilityMod)}${pb}${other}`,
    };
  });
});

const skills = computed(() => {
  if (!sheet.value) return [];
  const wanted = [
    'Bluff',
    'Knowledge (arcana)',
    'Knowledge (religion)',
    'Knowledge (nature)',
    'Knowledge (planes)',
    'Perception',
    'Sense Motive',
    'Survival',
  ];
  const common = {
    level: level.value,
    studied: options.studied,
    focus: options.focus,
    reduced: options.reduced,
    effects: effects.value,
  };
  return Object.entries(sheet.value.skills || {})
    .filter(([name]) => wanted.some(w => name.toLowerCase().startsWith(w.toLowerCase())))
    .map(([name, base]) => ({ name, bonus: skillBonus(base, common) }));
});

const dc = computed(() =>
  sheet.value
    ? dcBonus({
        level: level.value,
        studied: options.studied,
        focus: options.focus,
        reduced: options.reduced,
        effects: effects.value,
      })
    : 0,
);

const kindLabel = kind => KINDS.find(k => k.value === kind)?.label || kind;
const signed = n => (n >= 0 ? `+${n}` : `${n}`);
const attackLine = modes => (modes[0] ? modes[0].attacks.map(a => signed(a.bonus)).join(' / ') : '');

function clear() {
  if (window.confirm('Remove the saved sheet from this device?')) sheet.value = null;
}
</script>

<template>
  <main class="page slayer-calc">
    <h2 class="pg">Slayer calculator</h2>

    <section class="panel">
      <p v-if="!sheet" class="mute">Load your character sheet (PDF with fillable fields) to start.</p>
      <label class="slayer-file">
        <span>{{ sheet ? 'Load another sheet' : 'Load character sheet (PDF)' }}</span>
        <input type="file" accept="application/pdf" :disabled="loading" @change="onFile" />
      </label>
      <p v-if="loading" class="mute">Reading the sheet…</p>
      <p v-if="error" class="mute" role="alert">{{ error }}</p>
    </section>

    <template v-if="sheet">
      <section class="panel">
        <h3 class="slayer-h">{{ sheet.name || 'Character' }}</h3>
        <p class="mute slayer-meta">
          {{ sheet.race }} · {{ sheet.classes.map(c => `${c.name} ${c.level}`).join(', ') }} · AC {{ sheet.ac }} · HP
          {{ sheet.hp }}
        </p>
        <p class="mute slayer-meta">
          Read {{ fieldCount || 'saved' }} fields · {{ sheet.weapons.length }} weapon{{
            sheet.weapons.length === 1 ? '' : 's'
          }}
        </p>
        <div class="slayer-abil">
          <span v-for="(a, k) in sheet.abilities" :key="k"
            >{{ k }} <b>{{ signed(a.mod) }}</b></span
          >
        </div>
        <button type="button" class="slayer-link" @click="clear">Remove sheet from this device</button>
      </section>

      <section class="panel">
        <h3 class="slayer-h">This fight</h3>
        <label class="slayer-check"><input v-model="options.studied" type="checkbox" /> Target is studied</label>
        <label class="slayer-check"><input v-model="options.undead" type="checkbox" /> Target is undead</label>
        <label class="slayer-check"
          ><input v-model="options.sneak" type="checkbox" /> Sneak attack applies (flanked or denied Dex)</label
        >
        <label class="slayer-check"
          ><input v-model="options.lastwall" type="checkbox" /> Lastwall Defender (vs undead)</label
        >
        <label class="slayer-check"
          ><input v-model="options.pointBlank" type="checkbox" /> Point Blank Shot (within 30 ft)</label
        >

        <div v-if="hasFocusFeat" class="slayer-focus">
          <label class="slayer-num">
            Focused Target: Targets given up, up to {{ Math.max(0, slots - 1) }}
            <input v-model.number="options.reduced" type="number" min="0" :max="Math.max(0, slots - 1)" />
          </label>
          <div class="slayer-cats">
            <p class="mute slayer-meta">
              Each target given up gives +1 to one category. Pick as many as targets given up.
            </p>
            <label class="slayer-check"
              ><input v-model="options.focus.attack" type="checkbox" :disabled="focusLocked('attack')" /> Attack
              +1</label
            >
            <label class="slayer-check"
              ><input v-model="options.focus.damage" type="checkbox" :disabled="focusLocked('damage')" /> Damage
              +1</label
            >
            <label class="slayer-check"
              ><input v-model="options.focus.skill" type="checkbox" :disabled="focusLocked('skill')" /> Skills +1</label
            >
            <label class="slayer-check"
              ><input v-model="options.focus.dc" type="checkbox" :disabled="focusLocked('dc')" /> DC +1</label
            >
          </div>
        </div>
      </section>

      <section class="panel">
        <h3 class="slayer-h">Buffs and debuffs</h3>
        <ul v-if="effects.length" class="slayer-effects">
          <li v-for="e in effects" :key="e.id">
            <label class="slayer-check">
              <input v-model="e.on" type="checkbox" :aria-label="`${e.name} on`" />
              <span :class="{ off: !e.on }">{{ e.name }}</span>
            </label>
            <span class="mute">{{ kindLabel(e.kind) }} {{ signed(e.value) }}</span>
            <button type="button" class="slayer-link" :aria-label="`Remove ${e.name}`" @click="removeEffect(e.id)">
              Remove
            </button>
          </li>
        </ul>
        <p v-else class="mute">No buffs or debuffs. Add one below.</p>
        <form class="slayer-add" @submit.prevent="addEffect">
          <input v-model="draft.name" type="text" placeholder="Name (e.g. Bless, Sunder)" aria-label="Effect name" />
          <select v-model="draft.kind" aria-label="Changes">
            <option v-for="k in KINDS" :key="k.value" :value="k.value">{{ k.label }}</option>
          </select>
          <input v-model="draft.value" type="number" placeholder="+2 or -2" aria-label="Value" inputmode="numeric" />
          <button type="submit">Add</button>
        </form>
        <p class="mute slayer-meta">Use a negative value for a debuff.</p>
      </section>

      <section class="panel">
        <h3 class="slayer-h">Weapons</h3>
        <article v-for="w in calc" :key="w.name" class="slayer-weapon">
          <header class="slayer-head">
            <b class="slayer-wname">{{ w.name }}</b>
            <span class="slayer-dmg"
              >{{ w.damage.diceText }} {{ signed(w.damage.flat)
              }}<template v-if="w.damage.sneakDice"> + {{ w.damage.sneakDice }}d6 sneak</template></span
            >
          </header>
          <ul class="slayer-options">
            <li v-for="m in w.modes" :key="m.id" class="slayer-option">
              <span class="slayer-opt-label">{{ m.label }}</span>
              <span class="slayer-atk">{{
                m.attacks.map(a => signed(a.bonus) + (a.arrows > 1 ? ` ×${a.arrows}` : '')).join(' / ')
              }}</span>
            </li>
          </ul>
          <details class="slayer-more">
            <summary>Breakdown, damage and crit</summary>
            <p class="mute slayer-meta">{{ w.breakdown }}</p>
            <p v-for="m in w.modes" v-show="m.note" :key="m.id + '-note'" class="mute slayer-meta">
              <b>{{ m.label }}:</b> {{ m.note }}
            </p>
            <p>
              <b>Damage per hit:</b> {{ w.damage.diceText }}
              <template v-if="w.damage.flat"> {{ signed(w.damage.flat) }}</template>
              <template v-for="p in w.damage.parts" :key="p.label"> · {{ p.label }} {{ signed(p.value) }}</template>
              <template v-if="w.damage.sneakDice">
                · sneak {{ w.damage.sneakDice }}d6 (once per attack roll, not multiplied on a crit)</template
              >
            </p>
            <p><b>Crit:</b> {{ w.critical.threshold }}–20, ×{{ w.critical.mult }} on dice and bonuses</p>
          </details>
        </article>
        <p v-if="!calc.length" class="mute">No weapons on this sheet.</p>
      </section>

      <section class="panel">
        <h3 class="slayer-h">Skills and DCs against the studied target</h3>
        <p class="mute slayer-meta">
          Ability DCs <b>{{ signed(dc) }}</b>
        </p>
        <ul class="slayer-skills">
          <li v-for="s in skills" :key="s.name">
            <span>{{ s.name }}</span> <b>{{ signed(s.bonus) }}</b>
          </li>
        </ul>
        <p v-if="!skills.length" class="mute">
          No Bluff, Knowledge, Perception, Sense Motive or Survival on this sheet.
        </p>
      </section>
    </template>
  </main>
</template>

<style scoped>
.slayer-calc {
  display: grid;
  gap: 12px;
  padding: 0 16px 24px;
}
.slayer-h {
  margin: 0 0 8px;
  font-size: 1.05rem;
}
.slayer-meta {
  margin: 0 0 8px;
}
.slayer-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 12px;
  align-items: baseline;
}
.slayer-options {
  list-style: none;
  margin: 6px 0;
  padding: 0;
  display: grid;
  gap: 4px;
}
.slayer-option {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding-left: 10px;
  border-left: 2px solid var(--line);
}
.slayer-more {
  margin-top: 6px;
}
.slayer-file {
  display: inline-flex;
  flex-direction: column;
  gap: 6px;
  font-weight: 700;
}
.slayer-file input {
  max-width: 100%;
}
.slayer-abil {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-bottom: 8px;
}
.slayer-check {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
}
.slayer-num {
  display: grid;
  gap: 4px;
  margin-top: 8px;
}
.slayer-num input {
  max-width: 120px;
}
.slayer-focus {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--line, #264452);
}
.slayer-cats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}
.slayer-weapon {
  padding: 8px 0;
  border-top: 1px solid var(--line, #264452);
}
.slayer-weapon:first-of-type {
  border-top: 0;
}
.slayer-effects {
  list-style: none;
  margin: 0 0 8px;
  padding: 0;
  display: grid;
  gap: 4px;
}
.slayer-effects li {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 10px;
}
.slayer-effects .off {
  text-decoration: line-through;
  opacity: 0.6;
}
.slayer-add {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1.2fr) minmax(0, 0.8fr) auto;
  gap: 6px;
  align-items: center;
}
.slayer-add input,
.slayer-add select {
  min-width: 0;
}
.slayer-break {
  margin-top: 6px;
  font-size: 0.92rem;
}
.slayer-break summary {
  color: var(--mute, #93b6ba);
  cursor: pointer;
}
.slayer-break p {
  margin: 4px 0;
}
.slayer-weapon header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.slayer-weapon summary {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  cursor: pointer;
  list-style: none;
}
.slayer-weapon summary::-webkit-details-marker {
  display: none;
}
.slayer-wname {
  font-size: 1.02rem;
}
.slayer-atk {
  font-weight: 700;
  color: var(--acc, #a99bff);
}
.slayer-dmg {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.slayer-skills {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
}
.slayer-skills li {
  display: flex;
  justify-content: space-between;
}
.slayer-link {
  background: none;
  border: 0;
  padding: 4px 0;
  color: var(--mute, #93b6ba);
  text-decoration: underline;
}
</style>
