<script setup>
// Stat block for the combat screen. Takes the summary from combatSummary() in lib/monsters.js.
import { abilityMod, signed } from '../../lib/monsters'

defineProps({ card: { type: Object, required: true } })
</script>

<template>
  <div class="combat-card">
    <p class="mute">
      CR {{ card.cr }}<template v-if="card.xp"> · XP {{ card.xp }}</template>
      · {{ card.size }} {{ card.type }}<template v-if="card.alignment"> · {{ card.alignment }}</template>
    </p>

    <!-- Defence -->
    <h3>Defense</h3>
    <div class="cc-grid">
      <div><span>HP</span><b>{{ card.hp }}</b><small>{{ card.hpLong }}</small></div>
      <div><span>AC</span><b>{{ card.ac }}</b><small>touch {{ card.touch }} · flat {{ card.flatFooted }}</small></div>
      <div><span>Fort</span><b>{{ signed(card.saves.fort) }}</b></div>
      <div><span>Ref</span><b>{{ signed(card.saves.ref) }}</b></div>
      <div><span>Will</span><b>{{ signed(card.saves.will) }}</b></div>
    </div>
    <ul class="cc-lines">
      <li v-if="card.dr.length"><b>DR</b> {{ card.dr.join(', ') }}</li>
      <li v-if="card.immunities.length"><b>Immune</b> {{ card.immunities.join(', ') }}</li>
      <li v-if="card.resistances.length"><b>Resist</b> {{ card.resistances.join(', ') }}</li>
      <li v-if="card.weaknesses.length"><b>Weaknesses</b> {{ card.weaknesses.join(', ') }}</li>
      <li v-if="card.sr != null"><b>SR</b> {{ card.sr }}</li>
    </ul>

    <!-- Offence -->
    <h3>Offense</h3>
    <ul class="cc-lines">
      <li v-if="card.speeds"><b>Speed</b> {{ card.speeds }}</li>
      <li><b>Space/Reach</b> {{ card.reachText }}</li>
    </ul>

    <p v-if="!card.attacks.length" class="mute">No attacks listed.</p>
    <div v-for="g in card.attacks" :key="g.kind" class="cc-block">
      <b>{{ g.kind }}</b>
      <ul class="grl">
        <li v-for="(line, i) in g.lines" :key="i">{{ line }}</li>
      </ul>
    </div>

    <div v-if="card.sla" class="cc-block">
      <b>Spell-Like Abilities<template v-if="card.sla.cl"> (CL {{ card.sla.cl }})</template></b>
      <ul class="grl">
        <li v-for="g in card.sla.groups" :key="g.freq"><b>{{ g.freq }}</b>—{{ g.items }}</li>
      </ul>
    </div>

    <div v-if="card.spells" class="cc-block">
      <b>Spells Known<template v-if="card.spells.cl"> (CL {{ card.spells.cl }})</template></b>
      <ul class="grl">
        <li v-for="r in card.spells.rows" :key="r.head"><b>{{ r.head }}</b>—{{ r.items }}</li>
      </ul>
    </div>

    <!-- Statistics -->
    <h3>Statistics</h3>
    <div class="cc-grid">
      <div v-for="[k, v] in card.abilities" :key="k">
        <span>{{ k }}</span>
        <b>{{ v }}</b>
        <small>{{ signed(abilityMod(v)) }}</small>
      </div>
    </div>
    <ul class="cc-lines">
      <li><b>Base Atk</b> {{ signed(card.bab) }} · <b>CMB</b> {{ signed(card.cmb) }}<template v-if="card.cmbOther"> ({{ card.cmbOther }})</template> · <b>CMD</b> {{ card.cmd }}<template v-if="card.cmdOther"> ({{ card.cmdOther }})</template></li>
      <li v-if="card.init != null"><b>Init</b> {{ signed(card.init) }}</li>
      <li v-if="card.feats.length"><b>Feats</b> {{ card.feats.join(', ') }}</li>
      <li v-if="card.skills.length"><b>Skills</b> {{ card.skills.join(', ') }}</li>
      <li v-if="card.senses.length"><b>Senses</b> {{ card.senses.join(', ') }}</li>
      <li v-if="card.languages.length"><b>Languages</b> {{ card.languages.join(', ') }}</li>
    </ul>

    <!-- Special -->
    <template v-if="card.auras.length || card.specialQualities.length || card.specialAbilities.length">
      <h3>Special</h3>
      <ul class="cc-lines">
        <li v-if="card.auras.length"><b>Aura</b> {{ card.auras.join(', ') }}</li>
        <li v-if="card.specialQualities.length"><b>Special Qualities</b> {{ card.specialQualities.join(', ') }}</li>
      </ul>
      <div v-for="a in card.specialAbilities" :key="a.name" class="cc-block">
        <b>{{ a.name }}</b>
        <p class="mute">{{ a.text }}</p>
      </div>
    </template>

    <p v-if="card.source" class="mute">Source: {{ card.source }}</p>

    <details v-if="card.descLong" style="margin-top:12px">
      <summary>Description</summary>
      <p class="mute">{{ card.descShort }}</p>
      <p class="mute">{{ card.descLong }}</p>
    </details>
  </div>
</template>

<style scoped>
.cc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
  gap: 8px;
  margin: 12px 0;
}

.cc-grid > div {
  display: grid;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 12px;
  background: var(--raise, rgba(255,255,255,.05));
}

.cc-grid span {
  font-size: 12px;
  color: var(--mute, #93b6ba);
}

.cc-grid b {
  font-size: 22px;
}

.cc-grid small {
  color: var(--mute, #93b6ba);
  font-size: 12px;
}

.cc-lines {
  list-style: none;
  margin: 8px 0;
  padding: 0;
  display: grid;
  gap: 6px;
  font-size: 15px;
  line-height: 1.45;
}

.cc-block {
  margin-top: 10px;
}

.cc-block p {
  margin: 4px 0 0;
}
</style>