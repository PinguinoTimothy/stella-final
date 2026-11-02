<script setup>
// Monster stat block. Same reading order as the classic printed stat block, so it is quick to scan:
// header and CR, Defense, Offense, Statistics, Special Abilities. Each section is a column of label/value
// lines, and the numbers that are used most in combat (HP, AC, saves) are large tiles.
import { abilityMod, signed, monsterArtUrl } from '../../lib/monsters'
import SpellNames from '../Refs/SpellNames.vue'
import LinkedText from '../Refs/LinkedText.vue'
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({ card: { type: Object, required: true } })

const xpText = (xp) => `XP ${Number(xp).toLocaleString('en-US')}`
const kindLabel = (k) => ({ melee: 'Melee', ranged: 'Ranged' }[k] || String(k).charAt(0).toUpperCase() + String(k).slice(1))
const joinList = (list) => (list || []).join(', ')
const hasDefense = (c) => c.dr.length || c.immunities.length || c.resistances.length || c.weaknesses.length || c.sr != null || c.defensiveAbilities.length

// ---------- art ----------
const broken = ref(false)

// ---------- zoom ----------
const zoom = ref(false)
const scale = ref(1)
const MIN = 1
const MAX = 4
const imgEl = ref(null)   // imagen ampliada dentro del overlay
const baseW = ref(0)      // ancho real de la imagen en modo "ajustar" (100 %)

const setScale = (v) => {
  const next = Math.min(MAX, Math.max(MIN, v))
  // Al salir del modo "ajustar", guardar el ancho real que tiene la imagen en pantalla
  if (scale.value === 1 && next > 1 && imgEl.value) {
    baseW.value = imgEl.value.clientWidth
  }
  scale.value = next
}
const zoomIn = () => setScale(scale.value * 1.5)
const zoomOut = () => setScale(scale.value / 1.5)
const reset = () => setScale(1)
const toggleZoom = () => setScale(scale.value > 1 ? 1 : 2.5)
// Cerrar al pulsar el fondo solo si no estamos ampliados, para no cerrar mientras se navega
const onBackdrop = () => { if (scale.value === 1) zoom.value = false }

function onWheel(e) {
  setScale(scale.value * (e.deltaY < 0 ? 1.15 : 1 / 1.15))
}

// Pellizco con dos dedos
let pinchDist = 0
const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
function onTouchStart(e) {
  if (e.touches.length === 2) pinchDist = dist(e.touches)
}
function onTouchMove(e) {
  if (e.touches.length !== 2 || !pinchDist) return
  e.preventDefault()
  const d = dist(e.touches)
  setScale(scale.value * (d / pinchDist))
  pinchDist = d
}
function onTouchEnd() { pinchDist = 0 }

// Al cerrar: volver a 100 % y restaurar el scroll de la página
watch(zoom, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
  if (!open) reset()
})

// Al cambiar de monstruo: reiniciar imagen y zoom
watch(() => props.card.name, () => {
  broken.value = false
  zoom.value = false
})

const onKey = (e) => {
  if (!zoom.value) return
  if (e.key === 'Escape') zoom.value = false
  if (e.key === '+' || e.key === '=') zoomIn()
  if (e.key === '-') zoomOut()
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
</script>

<template>
  <article class="sb">
    <header class="sb-head">
      <div class="sb-title">
        <h3 class="sb-name">{{ card.name }}</h3>

        <button
          v-if="!broken && card.name"
          type="button"
          class="cc-art-btn"
          :aria-label="`Ver ${card.name} a pantalla completa`"
          @click="zoom = true"
        >
          <img
            class="cc-art"
            :src="monsterArtUrl(card.name)"
            :alt="card.name"
            loading="lazy"
            @error="broken = true"
          >
        </button>

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
          <li v-for="g in card.sla.groups" :key="g.freq"><b>{{ g.freq }}</b> <SpellNames :list="g.items" /></li>
        </ul>
      </div>

      <div v-if="card.spells" class="sb-spells">
        <h5 class="sb-atk-kind">Spells Known<template v-if="card.spells.cl"> (CL {{ card.spells.cl }})</template></h5>
        <ul>
          <li v-for="r in card.spells.rows" :key="r.head"><b>{{ r.head }}</b> <SpellNames :list="r.items" /></li>
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
        <p><LinkedText :text="a.text" /></p>
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

    <!-- Overlay de la imagen a pantalla completa, fuera del flujo del artículo -->
    <Teleport to="body">
      <div
        v-if="zoom"
        class="art-zoom"
        role="dialog"
        aria-modal="true"
        :aria-label="card.name"
        @click.self="onBackdrop"
        @wheel.prevent="onWheel"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      >
        <button type="button" class="art-zoom-close" aria-label="Cerrar" @click="zoom = false">×</button>

        <div class="art-zoom-scroll" @click.self="onBackdrop">
          <img
            ref="imgEl"
            class="art-zoom-img"
            :style="scale > 1 ? { width: `${baseW * scale}px` } : null"
            :src="monsterArtUrl(card.name)"
            :alt="card.name"
            draggable="false"
            @click.stop
            @dblclick="toggleZoom"
          >
        </div>

        <div class="art-zoom-bar">
          <button type="button" aria-label="Alejar" :disabled="scale <= MIN" @click="zoomOut">−</button>
          <button type="button" class="art-zoom-pct" @click="reset">{{ Math.round(scale * 100) }}%</button>
          <button type="button" aria-label="Acercar" :disabled="scale >= MAX" @click="zoomIn">+</button>
        </div>
      </div>
    </Teleport>
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

/* ---------- miniatura en la ficha ---------- */
.cc-art {
  display: block;
  width: 100%;
  max-height: 240px;
  margin-bottom: 12px;
  object-fit: contain;
  border-radius: 14px;
  background: var(--raise, rgba(255, 255, 255, .05));
}
.cc-art-btn {
  all: unset;
  display: block;
  width: 100%;
  cursor: zoom-in;
  border-radius: 14px;
}
.cc-art-btn:focus-visible { outline: 2px solid var(--acc, #a99bff); outline-offset: 2px; }

/* ---------- overlay a pantalla completa ---------- */
.art-zoom {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: flex;
  flex-direction: column;
  padding: env(safe-area-inset-top) 0 env(safe-area-inset-bottom);
  background: rgba(0, 0, 0, .92);
  touch-action: pan-x pan-y; /* desactiva el zoom nativo; el pellizco lo gestiona el script */
}
.art-zoom-scroll {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: auto;
  overscroll-behavior: contain;
}
.art-zoom-img {
  flex: none;              /* que flex no encoja la imagen cuando está ampliada */
  display: block;
  max-width: 100%;
  max-height: 100%;
  margin: auto;            /* centra sin recortar cuando la imagen es más grande */
  object-fit: contain;
  border-radius: 10px;
  user-select: none;
  -webkit-user-drag: none;
  cursor: zoom-in;
}
.art-zoom-img[style] {
  max-width: none;
  max-height: none;
  cursor: zoom-out;
}
.art-zoom-close {
  position: absolute;
  top: calc(env(safe-area-inset-top) + 8px);
  right: 12px;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, .15);
  color: #fff;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}
.art-zoom-bar {
  flex: none;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 10px 16px 16px;
}
.art-zoom-bar button {
  min-width: 44px;
  height: 44px;
  padding: 0 12px;
  border: 0;
  border-radius: 22px;
  background: rgba(255, 255, 255, .15);
  color: #fff;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}
.art-zoom-bar button:disabled { opacity: .35; cursor: default; }
.art-zoom-bar .art-zoom-pct { min-width: 72px; font-size: 15px; }
</style>