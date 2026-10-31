<script setup>
// Stat block. Key numbers first (HP, AC, saves, CMB, CMD, initiative), then attacks, then the rest.
import { abilityMod, signed } from '../../lib/monsters'

defineProps({ card: { type: Object, required: true } })
</script>

<template>
  <div class="combat-card">
    <p class="mute cc-sub">
      CR {{ card.cr }}<template v-if="card.xp"> · XP {{ card.xp }}</template>
      · {{ card.size }} {{ card.type }}<template v-if="card.alignment"> · {{ card.alignment }}</template>
    </p>

    <!-- Key numbers -->
    <div class="cc-key">
      <div class="cc-hp"><span>HP</span><b>{{ card.hp }}</b><small>{{ card.hpLong }}</small></div>
      <div><span>AC</span><b>{{ card.ac }}</b><b><small>touch {{ card.touch }}</small></b><small> flat {{ card.flatFooted }}</small></div>
      <div><span>Fort</span><b>{{ signed(card.saves.fort) }}</b></div>
      <div><span>Ref</span><b>{{ signed(card.saves.ref) }}</b></div>
      <div><span>Will</span><b>{{ signed(card.saves.will) }}</b></div>
      <div><span>CMB</span><b>{{ signed(card.cmb) }}</b><small v-if="card.cmbOther">{{ card.cmbOther }}</small></div>
      <div><span>CMD</span><b>{{ card.cmd }}</b><small v-if="card.cmdOther">{{ card.cmdOther }}</small></div>
      <div><span>Init</span><b>{{ signed(card.init) }}</b></div>
    </div>

    <!-- Attacks: the most used part in combat -->
    <section class="cc-attacks">
      <h3>Attacks</h3>
      <p v-if="!card.attacks.length" class="mute">No attacks listed.</p>
      <div v-for="g in card.attacks" :key="g.kind" class="cc-atk-group">
        <span class="cc-pill">{{ g.kind }}</span>
        <ul class="cc-atk">
          <li v-for="(line, i) in g.lines" :key="i">{{ line }}</li>
        </ul>
      </div>
      <p class="cc-move">
        <b>Speed</b> {{ card.speeds || '—' }} · <b>Space/Reach</b> {{ card.reachText }}
      </p>
    </section>

    <!-- Spells and spell-like abilities -->
    <section v-if="card.sla" class="cc-block">
      <h3>Spell-Like Abilities<template v-if="card.sla.cl"> (CL {{ card.sla.cl }})</template></h3>
      <ul class="cc-lines">
        <li v-for="g in card.sla.groups" :key="g.freq"><b>{{ g.freq }}</b>—{{ g.items }}</li>
      </ul>
    </section>

    <section v-if="card.spells" class="cc-block">
      <h3>Spells Known<template v-if="card.spells.cl"> (CL {{ card.spells.cl }})</template></h3>
      <ul class="cc-lines">
        <li v-for="r in card.spells.rows" :key="r.head"><b>{{ r.head }}</b>—{{ r.items }}</li>
      </ul>
    </section>

    <!-- Special abilities (text) -->
    <section v-if="card.specialAbilities.length" class="cc-block">
      <h3>Special Abilities</h3>
      <div v-for="a in card.specialAbilities" :key="a.name" class="cc-special">
        <b>{{ a.name }}</b>
        <p class="mute">{{ a.text }}</p>
      </div>
    </section>

    <!-- Defence (saves and CMB are already in the key numbers above) -->
    <section
      v-if="card.dr.length || card.immunities.length || card.resistances.length || card.weaknesses.length || card.defensiveAbilities.length || card.sr != null"
      class="cc-block"
    >
      <h3>Defense</h3>
      <ul class="cc-lines">
        <li v-if="card.dr.length"><b>DR</b> {{ card.dr.join(', ') }}</li>
        <li v-if="card.immunities.length"><b>Immune</b> {{ card.immunities.join(', ') }}</li>
        <li v-if="card.resistances.length"><b>Resist</b> {{ card.resistances.join(', ') }}</li>
        <li v-if="card.weaknesses.length"><b>Weaknesses</b> {{ card.weaknesses.join(', ') }}</li>
        <li v-if="card.sr != null"><b>SR</b> {{ card.sr }}</li>
        <li v-if="card.defensiveAbilities.length"><b>Defensive Abilities</b> {{ card.defensiveAbilities.join(', ') }}</li>
      </ul>
    </section>

    <!-- Statistics -->
    <section class="cc-block">
      <h3>Statistics</h3>
      <div class="cc-abil">
        <div v-for="[k, v] in card.abilities" :key="k">
          <span>{{ k }}</span>
          <b>{{ v }}</b>
          <small>{{ signed(abilityMod(v)) }}</small>
        </div>
      </div>
      <ul class="cc-lines">
        <li><b>Base Atk</b> {{ signed(card.bab) }}</li>
        <li v-if="card.feats.length"><b>Feats</b> {{ card.feats.join(', ') }}</li>
        <li v-if="card.skills.length"><b>Skills</b> {{ card.skills.join(', ') }}</li>
        <li v-if="card.senses.length"><b>Senses</b> {{ card.senses.join(', ') }}</li>
        <li v-if="card.languages.length"><b>Languages</b> {{ card.languages.join(', ') }}</li>
      </ul>
    </section>

        <!-- Gear -->
    <section v-if="card.combatGear || card.otherGear" class="cc-block">
      <h3>Gear</h3>
      <ul class="cc-lines">
        <li v-if="card.combatGear"><b>Combat Gear</b> {{ card.combatGear }}</li>
        <li v-if="card.otherGear"><b>Other Gear</b> {{ card.otherGear }}</li>
      </ul>
    </section>
    
    <!-- Special -->
    <section v-if="card.auras.length || card.specialQualities.length" class="cc-block">
      <h3>Special</h3>
      <ul class="cc-lines">
        <li v-if="card.auras.length"><b>Aura</b> {{ card.auras.join(', ') }}</li>
        <li v-if="card.specialQualities.length"><b>Special Qualities</b> {{ card.specialQualities.join(', ') }}</li>
      </ul>
    </section>

    <p v-if="card.source" class="mute cc-source">Source: {{ card.source }}</p>

    <details v-if="card.descLong" class="cc-desc">
      <summary>Description</summary>
      <p class="mute">{{ card.descShort }}</p>
      <p class="mute">{{ card.descLong }}</p>
    </details>
  </div>
</template>

<style scoped>
.cc-sub {
  margin: 0 0 10px;
}

.cc-key {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(84px, 1fr));
  gap: 8px;
  margin-bottom: 14px;
}

.cc-key > div {
  display: grid;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 12px;
  background: var(--raise, rgba(255,255,255,.05));
}

.cc-key span {
  font-size: 12px;
  color: var(--mute, #93b6ba);
}

.cc-key b {
  font-size: 24px;
  line-height: 1.1;
}

.cc-key small {
  color: var(--mute, #93b6ba);
  font-size: 12px;
}

.cc-attacks h3 {
  margin-bottom: 8px;
  color: var(--acc, #a99bff);
}

.cc-atk-group {
  display: grid;
  gap: 6px;
  margin-bottom: 10px;
  padding: 10px 12px;
  border-left: 3px solid var(--acc, #a99bff);
  border-radius: 12px;
  background: var(--raise, rgba(255,255,255,.05));
}

.cc-pill {
  justify-self: start;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--spent, #2a4755);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .04em;
  text-transform: uppercase;
}

.cc-atk {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}

.cc-atk li {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.cc-move {
  margin: 8px 0 0;
  font-size: 14px;
}

.cc-block {
  margin-top: 16px;
}

.cc-block h3 {
  margin-bottom: 6px;
}

.cc-lines {
  list-style: none;
  margin: 6px 0;
  padding: 0;
  display: grid;
  gap: 6px;
  font-size: 15px;
  line-height: 1.45;
}

.cc-special {
  margin-bottom: 8px;
}

.cc-special p {
  margin: 2px 0 0;
}

.cc-abil {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(66px, 1fr));
  gap: 6px;
  margin: 6px 0 10px;
}

.cc-abil > div {
  display: grid;
  justify-items: center;
  padding: 6px 4px;
  border-radius: 10px;
  background: var(--raise, rgba(255,255,255,.05));
}

.cc-abil span {
  font-size: 12px;
  color: var(--mute, #93b6ba);
}

.cc-abil b {
  font-size: 18px;
}

.cc-abil small {
  color: var(--mute, #93b6ba);
  font-size: 12px;
}

.cc-source {
  margin-top: 14px;
}

.cc-desc {
  margin-top: 12px;
}
</style>