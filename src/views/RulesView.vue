<script setup>
// Rules at the table: which actions provoke an attack of opportunity, and the concentration check.
import { computed, reactive, ref } from 'vue'
import { AOO_GROUPS, AOO_LABEL, AOO_NOTES, CASTING_ABILITY, CONCENTRATION } from '../lib/rules'

const tab = ref('aoo')
const query = ref('')
const onlyProvoking = ref(false)

const groups = computed(() => {
  const q = query.value.trim().toLowerCase()
  return AOO_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter(([name, aoo]) =>
      (!q || name.toLowerCase().includes(q) || g.group.toLowerCase().includes(q)) &&
      (!onlyProvoking.value || aoo === 'yes' || aoo === 'maybe' || aoo === 'usually'),
    ),
  })).filter((g) => g.items.length)
})

const calc = reactive({ situation: 'injured', level: 1, damage: 0, spellDc: 10, cmb: 0 })
const dc = computed(() => {
  const s = CONCENTRATION.find((x) => x.id === calc.situation)
  const n = {
    level: Math.max(0, Math.min(9, Number(calc.level) || 0)),
    damage: Math.max(0, Number(calc.damage) || 0),
    spellDc: Number(calc.spellDc) || 0,
    cmb: Number(calc.cmb) || 0,
  }
  return s ? s.dc(n) : null
})
const note = computed(() => CONCENTRATION.find((x) => x.id === calc.situation)?.note || '')
</script>

<template>
  <main class="page rules-page">
    <h2 class="pg">Rules</h2>

    <div class="rules-tabs" role="group" aria-label="Rules">
      <button type="button" :aria-pressed="tab === 'aoo'" @click="tab = 'aoo'">Attacks of opportunity</button>
      <button type="button" :aria-pressed="tab === 'conc'" @click="tab = 'conc'">Concentration</button>
    </div>

    <!-- ATTACKS OF OPPORTUNITY -->
    <section v-if="tab === 'aoo'">
      <p class="rules-general"><b>Note 1.</b> {{ AOO_NOTES[1] }}</p>

      <div class="rules-filter">
        <input v-model="query" type="search" placeholder="Find an action…" aria-label="Find an action">
        <label class="rules-check"><input v-model="onlyProvoking" type="checkbox"> Only those that provoke</label>
      </div>

      <div v-for="g in groups" :key="g.group" class="rules-group">
        <h3>{{ g.group }}</h3>
        <ul class="rules-list">
          <li v-for="([name, aoo, note]) in g.items" :key="name" :class="'aoo-' + aoo">
            <span class="rules-name">{{ name }}</span>
            <span class="rules-aoo">{{ AOO_LABEL[aoo] }}<template v-if="note"> · note {{ note }}</template></span>
          </li>
        </ul>
      </div>
      <p v-if="!groups.length" class="mute">No action matches.</p>
      <h3 class="rules-notes-h">Notes</h3>
      <ol class="rules-notes">
        <li v-for="n in [2, 3, 4, 5, 6, 7]" :key="n" :value="n">{{ AOO_NOTES[n] }}</li>
      </ol>
    </section>

    <!-- CONCENTRATION -->
    <section v-else class="rules-conc">
      <p>
        Casting a spell can be interrupted. When it is, roll a d20 and add your caster level and your casting
        ability modifier. If the total is lower than the DC, the spell is lost.
      </p>
      <ul class="rules-abilities">
        <li v-for="[text] in CASTING_ABILITY" :key="text">{{ text }}</li>
      </ul>

      <h3>DC calculator</h3>
      <div class="rules-calc">
        <label>Situation
          <select v-model="calc.situation">
            <option v-for="s in CONCENTRATION" :key="s.id" :value="s.id">{{ s.label }}</option>
          </select>
        </label>
        <label>Spell level
          <input v-model.number="calc.level" type="number" min="0" max="9" inputmode="numeric">
        </label>
        <label v-if="['injured', 'continuous'].includes(calc.situation)">Damage taken
          <input v-model.number="calc.damage" type="number" min="0" inputmode="numeric">
        </label>
        <label v-if="calc.situation === 'nondamaging'">Affecting spell's DC
          <input v-model.number="calc.spellDc" type="number" min="0" inputmode="numeric">
        </label>
        <label v-if="calc.situation === 'grappled'">Grappler's CMB
          <input v-model.number="calc.cmb" type="number" inputmode="numeric">
        </label>
      </div>

      <div class="rules-result">
        <span class="rules-dc">{{ dc === null ? '—' : 'DC ' + dc }}</span>
        <span class="mute">{{ note }}</span>
      </div>

      <h3>Other cases</h3>
      <ul class="rules-bullets">
        <li>Casting defensively: a check to avoid attacks of opportunity; a failed check loses the spell.</li>
        <li>Pinned creatures can cast only spells without somatic components.</li>
        <li>Casting while entangled or in violent weather follows the rows of the table.</li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.rules-tabs { display: flex; gap: 8px; margin: 10px 0 14px; }
.rules-tabs button { min-height: 40px; padding: 0 14px; border-radius: 999px; cursor: pointer; }
.rules-tabs button[aria-pressed="true"] { border-color: var(--acc); color: var(--acc); }
.rules-filter { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 10px; }
.rules-filter input[type="search"] { flex: 1; min-width: 200px; min-height: 40px; border-radius: 10px; }
.rules-check { display: flex; align-items: center; gap: 6px; font-size: 14px; }
.rules-group h3 { margin: 16px 0 6px; font-family: var(--disp); font-weight: 400; font-size: 20px; color: var(--acc); }
.rules-list { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line); }
.rules-list li { display: flex; justify-content: space-between; gap: 12px; padding: 8px 2px; border-bottom: 1px solid var(--line); font-size: 14px; }
.rules-aoo { white-space: nowrap; color: var(--mute); font-size: 13px; }
.aoo-yes .rules-aoo { color: var(--warn); font-weight: 700; }
.aoo-maybe .rules-aoo, .aoo-usually .rules-aoo { color: var(--gold); }
.rules-general { margin: 0 0 12px; font-size: 14px; line-height: 1.5; padding: 10px 12px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
.rules-notes-h { margin: 18px 0 6px; font-family: var(--disp); font-weight: 400; font-size: 20px; color: var(--acc); }
.rules-notes { margin: 0; padding-left: 22px; font-size: 14px; line-height: 1.5; display: grid; gap: 6px; }
.rules-conc p { margin: 0 0 10px; line-height: 1.5; }
.rules-abilities { margin: 0 0 14px; padding-left: 18px; color: var(--mute); font-size: 14px; }
.rules-calc { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
.rules-calc label { display: grid; gap: 4px; font-size: 13px; color: var(--mute); }
.rules-calc input, .rules-calc select { min-height: 38px; border-radius: 9px; }
.rules-result { display: flex; align-items: baseline; gap: 12px; margin: 16px 0; padding: 12px 14px; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); }
.rules-dc { font-family: var(--disp); font-size: 30px; color: var(--gold); }
.rules-bullets { margin: 0; padding-left: 18px; font-size: 14px; line-height: 1.5; }
</style>
