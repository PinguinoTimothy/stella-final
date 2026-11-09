<script setup>
// More › Slayer calculator: load a fillable character sheet (PDF) and work out attack, damage and skill bonuses
// against a target. The sheet is kept on this device only.
import { computed, reactive, ref, watch } from 'vue';
import { readSheet } from '../lib/sheetFields';
import { readFormFields } from '../lib/sheetPdf';
import { calcWeapon, dcBonus, skillBonus, studiedTargetSlots } from '../lib/slayer';

const KEY = 'pf1e-slayer-sheet-v1';

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
    if (!Object.keys(fields).length) {
      error.value = 'This PDF has no filled-in form fields, so it cannot be read.';
      return;
    }
    const s = readSheet(fields);
    if (!s.slayerLevel) {
      error.value = 'No Slayer class found on this sheet.';
      return;
    }
    sheet.value = s;
    // Feats found in the sheet notes start switched on; the switches can still be changed.
    options.seethingHatred = s.hasSeethingHatred;
    options.lastwall = s.hasLastwall;
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
  seethingHatred: false,
  lastwall: false,
  reduced: 0,
  focus: { attack: false, damage: false, skill: false, dc: false },
  ac: '',
});

const level = computed(() => sheet.value?.slayerLevel || 0);
const slots = computed(() => studiedTargetSlots(level.value));
const hasFocusFeat = computed(() => sheet.value?.hasLegalFocusedTarget || options.reduced > 0);
const acNumber = computed(() => (options.ac === '' || options.ac == null ? undefined : Number(options.ac)));

const calc = computed(() => {
  if (!sheet.value) return [];
  const common = {
    level: level.value,
    studied: options.studied,
    undead: options.undead,
    seethingHatred: options.seethingHatred,
    lastwall: options.lastwall,
    sneak: options.sneak,
    focus: options.focus,
    reduced: options.reduced,
    ac: acNumber.value,
  };
  return sheet.value.weapons.map(w => calcWeapon(w, common));
});

const skills = computed(() => {
  if (!sheet.value) return [];
  const wanted = ['Bluff', 'Knowledge (arcana)', 'Knowledge (religion)', 'Knowledge (nature)', 'Knowledge (planes)', 'Perception', 'Sense Motive', 'Survival'];
  const common = { level: level.value, studied: options.studied, focus: options.focus, reduced: options.reduced };
  return Object.entries(sheet.value.skills || {})
    .filter(([name]) => wanted.some(w => name.toLowerCase().startsWith(w.toLowerCase())))
    .map(([name, base]) => ({ name, bonus: skillBonus(base, common) }));
});

const dc = computed(() => (sheet.value ? dcBonus({ level: level.value, studied: options.studied, focus: options.focus, reduced: options.reduced }) : 0));

const signed = n => (n >= 0 ? `+${n}` : `${n}`);
const pct = p => (p == null ? '—' : `${Math.round(p * 100)}%`);
const avg = n => (Math.round(n * 10) / 10).toString();

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
          {{ sheet.race }} · {{ sheet.classes.map(c => `${c.name} ${c.level}`).join(', ') }} · AC {{ sheet.ac }} · HP {{ sheet.hp }}
        </p>
        <div class="slayer-abil">
          <span v-for="(a, k) in sheet.abilities" :key="k">{{ k }} <b>{{ signed(a.mod) }}</b></span>
        </div>
        <button type="button" class="slayer-link" @click="clear">Remove sheet from this device</button>
      </section>

      <section class="panel">
        <h3 class="slayer-h">This fight</h3>
        <label class="slayer-check"><input v-model="options.studied" type="checkbox" /> Target is studied</label>
        <label class="slayer-check"><input v-model="options.undead" type="checkbox" /> Target is undead</label>
        <label class="slayer-check"><input v-model="options.sneak" type="checkbox" /> Sneak attack applies (flanked or denied Dex)</label>
        <label class="slayer-check"><input v-model="options.seethingHatred" type="checkbox" /> Seething Hatred</label>
        <label class="slayer-check"><input v-model="options.lastwall" type="checkbox" /> Lastwall Defender (vs undead)</label>
        <label class="slayer-num">Target AC (optional) <input v-model="options.ac" type="number" min="0" inputmode="numeric" /></label>

        <div v-if="hasFocusFeat" class="slayer-focus">
          <label class="slayer-num">
            Targets given up (Legal Focused Target, up to {{ Math.max(0, slots - 1) }})
            <input v-model.number="options.reduced" type="number" min="0" :max="Math.max(0, slots - 1)" />
          </label>
          <div class="slayer-cats">
            <label class="slayer-check"><input v-model="options.focus.attack" type="checkbox" /> Attack +1</label>
            <label class="slayer-check"><input v-model="options.focus.damage" type="checkbox" /> Damage +1</label>
            <label class="slayer-check"><input v-model="options.focus.skill" type="checkbox" /> Skills +1</label>
            <label class="slayer-check"><input v-model="options.focus.dc" type="checkbox" /> DC +1</label>
          </div>
        </div>
      </section>

      <section class="panel">
        <h3 class="slayer-h">Weapons</h3>
        <article v-for="w in calc" :key="w.name" class="slayer-weapon">
          <header>
            <b>{{ w.name }}</b>
            <span>Attack <b>{{ signed(w.attack) }}</b></span>
          </header>
          <p>
            Damage {{ w.damage.dice }} <b>avg {{ avg(w.damage.average) }}</b>
            <span v-if="w.damage.sneakDice">· +{{ w.damage.sneakDice }}d6 sneak</span>
          </p>
          <p>
            Crit {{ w.critical.threshold }}–20 <b>avg {{ avg(w.critical.average) }}</b>
            <span v-if="acNumber != null">· hit {{ pct(w.hit) }}</span>
          </p>
        </article>
        <p v-if="!calc.length" class="mute">No weapons on this sheet.</p>
      </section>

      <section class="panel">
        <h3 class="slayer-h">Skills and DCs against the studied target</h3>
        <p class="mute slayer-meta">Ability DCs <b>{{ signed(dc) }}</b></p>
        <ul class="slayer-skills">
          <li v-for="s in skills" :key="s.name"><span>{{ s.name }}</span> <b>{{ signed(s.bonus) }}</b></li>
        </ul>
        <p v-if="!skills.length" class="mute">No Bluff, Knowledge, Perception, Sense Motive or Survival on this sheet.</p>
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
.slayer-weapon header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.slayer-weapon p {
  margin: 4px 0 0;
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
