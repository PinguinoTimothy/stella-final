<script setup>
// Monster stat block. Same reading order as the classic printed stat block, so it is quick to scan:
// header and CR, Defense, Offense, Statistics, Special Abilities. Each section is a column of label/value
// lines, and the numbers that are used most in combat (HP, AC, saves) are large tiles.
import { abilityMod, signed } from '../../lib/monsters'

const props = defineProps({ card: { type: Object, required: true } })

const xpText = (xp) => `XP ${Number(xp).toLocaleString('en-US')}`
const kindLabel = (k) => ({ melee: 'Melee', ranged: 'Ranged' }[k] || String(k).charAt(0).toUpperCase() + String(k).slice(1))
const joinList = (list) => (list || []).join(', ')
const hasDefense = (c) => c.dr.length || c.immunities.length || c.resistances.length || c.weaknesses.length || c.sr != null || c.defensiveAbilities.length
</script>

<template>
  <article class="sb">
    <header class="sb-head">
      <div class="sb-title">
        <h3 class="sb-name">{{ card.name }}</h3>
        <p class="sb-sub">
          <span>{{ [card.size, card.type].filter(Boolean).join(' ') }}</span>
          <span v-if="card.alignment">{{ card.alignment }}</span>
          <span v-if="card.xp">{{ xpText(card.xp) }}</span>
        </p>
      </div>
      <span class="sb-cr"><small>CR</small>{{ card.cr }}</span>
    </header>

    <p v-if="card.descShort" class="sb-intro">{{ card.descShort }}</p>

    <dl class="sb-facts">
      <div v-if="card.init != null"><dt>Init</dt><dd>{{ signed(card.init) }}</dd></div>
      <div v-if="card.senses.length"><dt>Senses</dt><dd>{{ joinList(card.senses) }}</dd></div>
      <div v-if="card.auras.length"><dt>Aura</dt><dd>{{ joinList(card.auras) }}</dd></div>
    </dl>

    <!-- DEFENSE -->
    <section class="sb-sec">
      <h4 class="sb-h">Defense</h4>
      <div class="sb-tiles">
        <div class="sb-tile">
          <span>AC</span><b>{{ card.ac ?? '—' }}</b>
                    <small>touch {{ card.touch ?? '—' }}</small>
          <small>flat-footed {{ card.flatFooted ?? '—' }}</small>
        </div>
        <div class="sb-tile sb-tile-hp">
          <span>HP</span><b>{{ card.hp ?? '—' }}</b>
          <small v-if="card.hpLong">{{ card.hpLong }}</small>
        </div>
        <div class="sb-tile"><span>Fort</span><b>{{ signed(card.saves.fort) }}</b></div>
        <div class="sb-tile"><span>Ref</span><b>{{ signed(card.saves.ref) }}</b></div>
        <div class="sb-tile"><span>Will</span><b>{{ signed(card.saves.will) }}</b></div>
      </div>
      <dl v-if="hasDefense(card)" class="sb-lines">
        <div v-if="card.dr.length"><dt>DR</dt><dd>{{ joinList(card.dr) }}</dd></div>
        <div v-if="card.immunities.length"><dt>Immune</dt><dd>{{ joinList(card.immunities) }}</dd></div>
        <div v-if="card.resistances.length"><dt>Resist</dt><dd>{{ joinList(card.resistances) }}</dd></div>
        <div v-if="card.sr != null"><dt>SR</dt><dd>{{ card.sr }}</dd></div>
        <div v-if="card.weaknesses.length"><dt>Weaknesses</dt><dd>{{ joinList(card.weaknesses) }}</dd></div>
        <div v-if="card.defensiveAbilities.length"><dt>Defensive Abilities</dt><dd>{{ joinList(card.defensiveAbilities) }}</dd></div>
      </dl>
    </section>

    <!-- OFFENSE -->
    <section class="sb-sec">
      <h4 class="sb-h">Offense</h4>
      <dl class="sb-lines">
        <div><dt>Speed</dt><dd>{{ card.speeds || '—' }}</dd></div>
        <div><dt>Space / Reach</dt><dd>{{ card.reachText }}</dd></div>
      </dl>

      <div v-for="g in card.attacks" :key="g.kind" class="sb-atk">
        <h5 class="sb-atk-kind">{{ kindLabel(g.kind) }}</h5>
        <ul>
          <li v-for="(line, i) in g.lines" :key="i">{{ line }}</li>
        </ul>
      </div>
      <p v-if="!card.attacks.length" class="sb-none">No attacks listed.</p>

      <div v-if="card.sla" class="sb-spells">
        <h5 class="sb-atk-kind">Spell-Like Abilities<template v-if="card.sla.cl"> (CL {{ card.sla.cl }})</template></h5>
        <ul>
          <li v-for="g in card.sla.groups" :key="g.freq"><b>{{ g.freq }}</b> {{ g.items }}</li>
        </ul>
      </div>

      <div v-if="card.spells" class="sb-spells">
        <h5 class="sb-atk-kind">Spells Known<template v-if="card.spells.cl"> (CL {{ card.spells.cl }})</template></h5>
        <ul>
          <li v-for="r in card.spells.rows" :key="r.head"><b>{{ r.head }}</b> {{ r.items }}</li>
        </ul>
      </div>
    </section>

    <!-- STATISTICS -->
    <section class="sb-sec">
      <h4 class="sb-h">Statistics</h4>
      <div class="sb-abil">
        <div v-for="[k, v] in card.abilities" :key="k">
          <span>{{ k }}</span>
          <b>{{ v }}</b>
          <small>{{ signed(abilityMod(v)) }}</small>
        </div>
      </div>
      <div class="sb-tiles sb-tiles-combat">
        <div class="sb-tile"><span>Base Atk</span><b>{{ signed(card.bab) }}</b></div>
        <div class="sb-tile">
          <span>CMB</span><b>{{ signed(card.cmb) }}</b>
          <small v-if="card.cmbOther">{{ card.cmbOther }}</small>
        </div>
        <div class="sb-tile">
          <span>CMD</span><b>{{ card.cmd ?? '—' }}</b>
          <small v-if="card.cmdOther">{{ card.cmdOther }}</small>
        </div>
      </div>
      <dl class="sb-lines">
        <div v-if="card.feats.length"><dt>Feats</dt><dd>{{ joinList(card.feats) }}</dd></div>
        <div v-if="card.skills.length"><dt>Skills</dt><dd>{{ joinList(card.skills) }}</dd></div>
        <div v-if="card.languages.length"><dt>Languages</dt><dd>{{ joinList(card.languages) }}</dd></div>
        <div v-if="card.specialQualities.length"><dt>Special Qualities</dt><dd>{{ joinList(card.specialQualities) }}</dd></div>
      </dl>
    </section>

    <!-- SPECIAL ABILITIES -->
    <section v-if="card.specialAbilities.length" class="sb-sec">
      <h4 class="sb-h">Special Abilities</h4>
      <div v-for="a in card.specialAbilities" :key="a.name" class="sb-special">
        <h5>{{ a.name }}</h5>
        <p>{{ a.text }}</p>
      </div>
    </section>

    <!-- GEAR AND SOURCE -->
    <section v-if="card.combatGear || card.otherGear" class="sb-sec">
      <h4 class="sb-h">Gear</h4>
      <dl class="sb-lines">
        <div v-if="card.combatGear"><dt>Combat Gear</dt><dd>{{ card.combatGear }}</dd></div>
        <div v-if="card.otherGear"><dt>Other Gear</dt><dd>{{ card.otherGear }}</dd></div>
      </dl>
    </section>

    <p v-if="card.source" class="sb-source">Source: {{ card.source }}</p>

    <details v-if="card.descLong" class="sb-desc">
      <summary>Description</summary>
      <p v-if="card.descShort">{{ card.descShort }}</p>
      <p>{{ card.descLong }}</p>
    </details>
  </article>
</template>

<style scoped>
.sb {
  color: var(--ink, #e8f4f1);
  font-size: 15px;
  line-height: 1.5;
}

/* ---------- header ---------- */
.sb-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.sb-name {
  margin: 0;
  font-family: var(--disp);
  font-size: 30px;
  line-height: 1.05;
  color: var(--acc, #a99bff);
}
.sb-sub {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 10px;
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--mute, #93b6ba);
}
.sb-sub span + span::before { content: "·"; margin-right: 10px; opacity: .6; }
.sb-cr {
  flex: none;
  display: grid;
  justify-items: center;
  min-width: 58px;
  padding: 6px 10px;
  border: 1px solid var(--line, #264452);
  border-radius: 14px 10px 15px 11px;
  font-family: var(--disp);
  font-size: 24px;
  line-height: 1;
  background: var(--raise, #172e3b);
}
.sb-cr small {
  font-family: var(--body);
  font-size: 11px;
  color: var(--mute, #93b6ba);
  letter-spacing: 0;
}
.sb-intro {
  margin: 10px 0 0;
  font-style: italic;
  color: var(--mute, #93b6ba);
}

/* ---------- facts (init, senses, aura) ---------- */
.sb-facts {
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--raise, #172e3b);
  display: grid;
  gap: 4px;
}
.sb-facts > div { display: grid; grid-template-columns: 76px 1fr; gap: 8px; }

/* ---------- sections ---------- */
.sb-sec { margin-top: 18px; }
.sb-h {
  margin: 0 0 10px;
  padding-bottom: 4px;
  border-bottom: 2px solid var(--acc, #a99bff);
  font-family: var(--disp);
  font-size: 22px;
  font-weight: 400;
  line-height: 1.1;
  color: var(--acc, #a99bff);
}

/* Label / value lines: the label column keeps every row lined up. */
.sb-lines {
  margin: 8px 0 0;
  display: grid;
  gap: 6px;
}
.sb-lines > div {
  display: grid;
  grid-template-columns: minmax(96px, max-content) 1fr;
  gap: 4px 12px;
}
.sb-lines dt {
  color: var(--mute, #93b6ba);
  font-size: 14px;
  font-weight: 700;
}
.sb-lines dd {
  margin: 0;
}

/* ---------- key numbers as tiles ---------- */
.sb-tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
  gap: 8px;
}
.sb-tile {
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 2px;
  padding: 10px 6px;
  border-radius: 14px;
  background: var(--raise, #172e3b);
  border: 1px solid var(--line, #264452);
  text-align: center;
}
.sb-tile span {
  font-size: 12px;
  color: var(--mute, #93b6ba);
}
.sb-tile b {
  font-family: var(--disp);
  font-size: 28px;
  font-weight: 400;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.sb-tile small {
  font-size: 12px;
  color: var(--mute, #93b6ba);
}
.sb-tile-hp { border-color: color-mix(in srgb, var(--acc, #a99bff) 40%, var(--line, #264452)); }
.sb-tiles-combat { margin-top: 12px; }

/* ---------- attacks and spells ---------- */
.sb-atk, .sb-spells {
  margin-top: 12px;
  padding-left: 12px;
  border-left: 3px solid var(--acc, #a99bff);
}
.sb-atk-kind {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 700;
  color: var(--acc, #a99bff);
}
.sb-atk ul, .sb-spells ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}
.sb-atk li { font-weight: 600; }
.sb-spells li { font-size: 14px; }
.sb-none { margin: 10px 0 0; color: var(--mute, #93b6ba); }

/* ---------- abilities ---------- */
.sb-abil {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(68px, 1fr));
  gap: 6px;
}
.sb-abil > div {
  display: grid;
  justify-items: center;
  padding: 8px 4px;
  border-radius: 12px;
  background: var(--raise, #172e3b);
}
.sb-abil span { font-size: 12px; color: var(--mute, #93b6ba); }
.sb-abil b { font-family: var(--disp); font-size: 22px; font-weight: 400; line-height: 1.1; }
.sb-abil small { font-size: 12px; color: var(--mute, #93b6ba); }

/* ---------- special abilities ---------- */
.sb-special { margin-bottom: 12px; }
.sb-special h5 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}
.sb-special p {
  margin: 3px 0 0;
  color: var(--ink, #e8f4f1);
}

.sb-source {
  margin: 18px 0 0;
  font-size: 13px;
  color: var(--mute, #93b6ba);
}
.sb-desc { margin-top: 10px; }
.sb-desc summary { cursor: pointer; color: var(--mute, #93b6ba); }
.sb-desc p { color: var(--mute, #93b6ba); }

@media (max-width: 480px) {
  .sb-name { font-size: 26px; }
  .sb-lines > div { grid-template-columns: 1fr; gap: 0; }
}
</style>
