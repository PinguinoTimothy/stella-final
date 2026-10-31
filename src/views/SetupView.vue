<script setup>
// More › Setup: character name, spellcasting classes, slots, domains and school DC bonuses.
// Every change goes through the store (snapshot → edit → log → undo toast), like the other screens.
import { computed } from 'vue'
import { useAppStore } from '../stores/app'
import BackButton from '../components/BackButton.vue'
import {
  CLASS_TABLES,
  applyClassPreset,
  applyClassTable,
  classLevel,
  classModifier,
  newCasterClass,
} from '../lib/classes'

const app = useAppStore()

const SCHOOLS = [
  'Abjuration', 'Conjuration', 'Divination', 'Enchantment',
  'Evocation', 'Illusion', 'Necromancy', 'Transmutation', 'Universal',
]
const PRESETS = Object.entries(CLASS_TABLES)

// [min, max, fallback] for number inputs. Values outside the range are clamped, not rejected.
const LIMITS = {
  lvl: [1, 20, 1],
  score: [1, 50, 10],
  cl: [0, 30, 0],
  dcb: [-20, 20, 0],
}

if (!Array.isArray(app.S.cl)) app.S.cl = []
const classes = computed(() => app.S.cl)

/** Fills in any missing arrays so older saves and new classes behave the same. */
function ensureClass(c) {
  if (!Array.isArray(c.base)) c.base = Array(10).fill(null)
  if (!Array.isArray(c.used)) c.used = Array(10).fill(0)
  if (!Array.isArray(c.dused)) c.dused = Array(10).fill(0)
  if (!Array.isArray(c.sp)) c.sp = Array.from({ length: 10 }, () => [])
  while (c.base.length < 10) c.base.push(null)
  while (c.used.length < 10) c.used.push(0)
  while (c.dused.length < 10) c.dused.push(0)
  while (c.sp.length < 10) c.sp.push([])
  if (!Array.isArray(c.domains)) c.domains = []
  if (!Array.isArray(c.dsel)) c.dsel = []
  if (!Array.isArray(c.sf)) c.sf = []
  if (c.all === undefined) c.all = false
  return c
}
classes.value.forEach(ensureClass)

function clamp(raw, [min, max, fallback]) {
  const n = Math.floor(Number(raw))
  if (raw === '' || !Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function beginChange() {
  app.snapshot()
}
function finishChange(message) {
  app.log('setup', message)
  app.notifyUndo(message)
}

/* ---------- character ---------- */

function updateName(event) {
  const value = event.target.value.trim()
  if (value === app.S.name) return
  beginChange()
  app.S.name = value
  finishChange('Character name updated')
}

/* ---------- classes ---------- */

function addClass() {
  beginChange()
  app.S.cl.push(ensureClass(newCasterClass(`Class ${classes.value.length + 1}`)))
  finishChange('Spellcasting class added')
}

async function deleteClass(index) {
  const c = classes.value[index]
  if (!c) return
  const ok = await app.ask({
    title: `Delete ${c.name || 'this class'}?`,
    msg: 'Its settings and prepared or known spells will be removed.',
    ok: 'Delete class',
    danger: true,
  })
  if (!ok) return
  beginChange()
  app.S.cl.splice(index, 1)
  finishChange('Spellcasting class deleted')
}

function updateField(index, key, value) {
  const c = classes.value[index]
  if (!c || c[key] === value) return
  beginChange()
  c[key] = value
  if (key === 'lvl' && c.pre) applyClassTable(c)
  finishChange(`${c.name || 'Class'}: ${key} updated`)
}

function updateText(index, key, event) {
  updateField(index, key, event.target.value)
}

function updateCheckbox(index, key, event) {
  updateField(index, key, event.target.checked)
}

function updateNumber(index, key, event) {
  const value = clamp(event.target.value, LIMITS[key] || [-999, 999, 0])
  event.target.value = value
  updateField(index, key, value)
}

async function changePreset(index, event) {
  const c = classes.value[index]
  const key = event.target.value
  if (!c || c.pre === key) return

  if (key) {
    const table = CLASS_TABLES[key]
    const ok = await app.ask({
      title: `Use the ${table.n} table?`,
      msg: 'Type, ability, spell slots and the domain and whole-list flags will follow this table. Domains and school bonuses are kept.',
      ok: 'Apply table',
    })
    if (!ok) {
      event.target.value = c.pre
      return
    }
  }

  beginChange()
  applyClassPreset(c, key)
  finishChange(key ? `${c.name}: ${CLASS_TABLES[key].n} table applied` : `${c.name}: manual setup`)
}

function updateBase(index, level, event) {
  const c = classes.value[index]
  if (!c) return
  const raw = event.target.value
  const value = raw === '' ? null : clamp(raw, [0, 99, 0])
  if (c.base[level] === value) return
  beginChange()
  c.base[level] = value
  finishChange(`${c.name}: level ${level} slots updated`)
}

/** Slots shown as a summary line, e.g. "Cantrips 4 · 1st 3 · 2nd 2". */
function slotSummary(c) {
  return c.base
    .map((value, level) => (value == null ? null : { level, value }))
    .filter(Boolean)
    .map(({ level, value }) => `${level === 0 ? 'Cantrips' : ordinal(level)} ${value}`)
    .join(' · ')
}
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

function modifierText(c) {
  const value = classModifier(c)
  return `${value >= 0 ? '+' : ''}${value}`
}

/* ---------- domains ---------- */

function addDomain(index) {
  beginChange()
  classes.value[index].domains.push({ name: '', parent: '' })
  finishChange('Domain added')
}

function updateDomain(index, domainIndex, key, event) {
  const domain = classes.value[index]?.domains?.[domainIndex]
  if (!domain) return
  const value = event.target.value.trim()
  if (domain[key] === value) return
  beginChange()
  domain[key] = value
  finishChange('Domain updated')
}

function removeDomain(index, domainIndex) {
  const c = classes.value[index]
  if (!c?.domains?.[domainIndex]) return
  beginChange()
  c.domains.splice(domainIndex, 1)
  finishChange('Domain removed')
}

/* ---------- school DC bonuses ---------- */

function addSchool(index) {
  beginChange()
  classes.value[index].sf.push({ sch: 'Evocation', b: 1 })
  finishChange('School DC bonus added')
}

function updateSchool(index, schoolIndex, key, event) {
  const entry = classes.value[index]?.sf?.[schoolIndex]
  if (!entry) return
  const value = key === 'b' ? clamp(event.target.value, [-20, 20, 0]) : event.target.value
  if (entry[key] === value) return
  beginChange()
  entry[key] = value
  finishChange('School DC bonus updated')
}

function removeSchool(index, schoolIndex) {
  beginChange()
  classes.value[index].sf.splice(schoolIndex, 1)
  finishChange('School DC bonus removed')
}
</script>

<template>
  <BackButton />
  <h2 class="pg">Setup</h2>
  <p class="mute">Character, spellcasting classes, slots, domains and school DC bonuses.</p>

  <section class="panel grid">
    <h3>Character</h3>
    <label>
      Character name
      <input :value="app.S.name" placeholder="Character name" @change="updateName">
    </label>
  </section>

  <section v-if="!classes.length" class="panel">
    <h3>No spellcasting classes</h3>
    <p class="mute">
      Add a class to set its slots and use Cast. You can start from a class table
      or set everything by hand.
    </p>
  </section>

  <details
    v-for="(c, index) in classes"
    :key="c.id || index"
    class="panel fold setup-class"
    :open="classes.length === 1"
  >
    <summary>
      <span>{{ c.name || `Class ${index + 1}` }}</span>
      <span class="mute">
        {{ c.pre ? `Level ${classLevel(c)}` : 'Manual' }} · CL {{ c.cl ?? 0 }} · mod {{ modifierText(c) }}
      </span>
    </summary>

    <div class="grid setup-fields">
      <p v-if="slotSummary(c)" class="setup-summary">
        Slots: {{ slotSummary(c) }}
        <span v-if="c.dom" class="tag dom">domain slot</span>
      </p>

      <label>
        Class name
        <input :value="c.name" placeholder="e.g. Wizard" @change="updateText(index, 'name', $event)">
      </label>

      <div class="grid g2">
        <label>
          Class table
          <select :value="c.pre" @change="changePreset(index, $event)">
            <option value="">Custom (manual)</option>
            <option v-for="[key, preset] in PRESETS" :key="key" :value="key">
              {{ preset.n }}
            </option>
          </select>
        </label>

        <label>
          Class level
          <input
            type="number" min="1" max="20" inputmode="numeric"
            :value="c.lvl || 1"
            @change="updateNumber(index, 'lvl', $event)"
          >
        </label>

        <label>
          Casting type
          <select :value="c.type" @change="updateText(index, 'type', $event)">
            <option value="prep">Prepared</option>
            <option value="spont">Spontaneous</option>
          </select>
        </label>

        <label>
          Casting ability
          <select :value="c.ab" @change="updateText(index, 'ab', $event)">
            <option value="int">INT</option>
            <option value="wis">WIS</option>
            <option value="cha">CHA</option>
          </select>
        </label>

        <label>
          Ability score
          <input
            type="number" min="1" max="50" inputmode="numeric"
            :value="c.score ?? 10"
            @change="updateNumber(index, 'score', $event)"
          >
        </label>

        <label>
          Caster level (CL)
          <input
            type="number" min="0" max="30" inputmode="numeric"
            :value="c.cl ?? 1"
            @change="updateNumber(index, 'cl', $event)"
          >
        </label>

        <label>
          General DC bonus
          <input
            type="number" inputmode="numeric"
            :value="c.dcb || 0"
            @change="updateNumber(index, 'dcb', $event)"
          >
        </label>

        <label>
          Names in the spell database
          <input
            :value="c.abbr || ''"
            placeholder="Wizard Wiz"
            @change="updateText(index, 'abbr', $event)"
          >
        </label>
      </div>

      <label class="row setup-check">
        <span>Knows its whole spell list (cleric, druid…)</span>
        <input type="checkbox" :checked="!!c.all" @change="updateCheckbox(index, 'all', $event)">
      </label>

      <label class="row setup-check">
        <span>Has a domain slot at every spell level (1+)</span>
        <input type="checkbox" :checked="!!c.dom" @change="updateCheckbox(index, 'dom', $event)">
      </label>

      <section v-if="c.dom" class="setup-subsection">
        <h3>Domains</h3>
        <p class="mute">
          Type the domain name as it appears in the spell database.
          For a subdomain, also fill in its parent: it replaces only the levels it lists.
        </p>

        <div
          v-for="(domain, domainIndex) in c.domains"
          :key="domainIndex"
          class="grid g2 setup-domain"
        >
          <label>
            Domain or subdomain
            <input
              :value="domain.name"
              placeholder="e.g. Void"
              @change="updateDomain(index, domainIndex, 'name', $event)"
            >
          </label>
          <label>
            Parent domain (subdomains only)
            <input
              :value="domain.parent"
              placeholder="e.g. Void"
              @change="updateDomain(index, domainIndex, 'parent', $event)"
            >
          </label>
          <button class="danger setup-remove" @click="removeDomain(index, domainIndex)">
            Remove domain
          </button>
        </div>

        <button @click="addDomain(index)">+ Add domain</button>
      </section>

      <section class="setup-subsection">
        <h3>School DC bonuses</h3>
        <p class="mute">
          For feats like Spell Focus or Greater Spell Focus. They apply only to spells of that school.
        </p>

        <div v-for="(entry, schoolIndex) in c.sf" :key="schoolIndex" class="row setup-school">
          <select
            :value="entry.sch"
            aria-label="School"
            @change="updateSchool(index, schoolIndex, 'sch', $event)"
          >
            <option v-for="school in SCHOOLS" :key="school" :value="school">{{ school }}</option>
          </select>

          <input
            type="number" inputmode="numeric"
            :value="entry.b"
            aria-label="DC bonus"
            @change="updateSchool(index, schoolIndex, 'b', $event)"
          >

          <button class="danger" aria-label="Remove bonus" @click="removeSchool(index, schoolIndex)">
            ×
          </button>
        </div>

        <button @click="addSchool(index)">+ Add bonus</button>
      </section>

      <section class="setup-subsection">
        <h3>Slots per day</h3>
        <p class="mute">
          Filled in automatically when you pick a class table and level. You can edit them.
          Leave a level empty if the class doesn't reach it.
        </p>

        <div class="setup-slots">
          <label v-for="(value, level) in c.base" :key="level">
            {{ level === 0 ? 'Cantrips' : `Lvl ${level}` }}
            <input
              type="number" min="0" step="1" inputmode="numeric"
              :value="value ?? ''"
              placeholder="—"
              @change="updateBase(index, level, $event)"
            >
          </label>
        </div>
      </section>

      <p v-if="c.pre" class="mute">
        Table: {{ CLASS_TABLES[c.pre]?.n }}. Caster level calculated as {{ c.cl }}.
        Changing the class or level recalculates the slots.
      </p>

      <p class="mute setup-dc">
        Base DC = 10 + spell level + {{ classModifier(c) + (c.dcb || 0) }}.
        School bonuses and per-spell bonuses are added on top.
      </p>

      <button class="danger" @click="deleteClass(index)">Delete this class</button>
    </div>
  </details>

  <button class="cast setup-add" @click="addClass">+ Add spellcasting class</button>
</template>

<style scoped>
.setup-fields {
  margin-top: 16px;
}

.setup-summary {
  margin: 0;
  color: var(--mute);
  font-size: 15px;
}

.setup-subsection {
  display: grid;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.setup-subsection h3 {
  margin: 0;
}

.setup-check {
  justify-content: space-between;
  gap: 12px;
}

.setup-check input {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.setup-slots {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.setup-slots label {
  min-width: 0;
  font-size: 13px;
}

.setup-slots input {
  width: 100%;
  min-width: 0;
}

.setup-school {
  gap: 8px;
}

.setup-school select {
  flex: 1;
  min-width: 0;
}

.setup-school input {
  width: 72px;
}

.setup-domain {
  align-items: end;
}

.setup-remove {
  justify-self: start;
}

.setup-dc {
  margin: 0;
}

.setup-add {
  width: 100%;
  margin-top: 12px;
}

@media (max-width: 380px) {
  .setup-slots {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>