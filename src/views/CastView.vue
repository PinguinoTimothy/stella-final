<script setup>
import { computed, ref, watch, nextTick } from "vue";
import { useAppStore } from "../stores/app";
import { useSpells } from "../stores/spells";
import { CLASS_TABLES } from "../lib/classes";
import FxStrip from "../components/Active/FxStrip.vue";
import { useEffects } from "../stores/effects";

const app = useAppStore();
const spellStore = useSpells();
const catalogSearch = ref("");
const castCatalog = ref([]);
const castCatalogLoading = ref(false);
const knownCatalogList = ref(null);
const showKnownCatalog = ref(true);
const effects = useEffects();

const eyeBlinking = ref(false);

const classTheme = computed(() => {
  // Primera clase: morado-rosa. Segunda: azul.
  const palettes = [
    { accent: "#d76bdc", soft: "#f09acb", glow: "rgba(215,107,220,.20)" },
    { accent: "#58a6ff", soft: "#82c9ff", glow: "rgba(88,166,255,.20)" },
  ];

  const palette = palettes[classIndex.value % palettes.length];

  return {
    "--cast-accent": palette.accent,
    "--cast-soft": palette.soft,
    "--cast-glow": palette.glow,
    "--acc": palette.accent,
  };
});

async function blinkEye() {
  eyeBlinking.value = false;
  await nextTick();
  eyeBlinking.value = true;

  window.setTimeout(() => {
    eyeBlinking.value = false;
  }, 450);
}

const classIndex = ref(0);
const selectedLevel = ref(0);
const prepareMode = ref(false);
const openSpell = ref(null);

const castingSlot = ref("");
let castingTimer;

function animateSlot(level, domain, index) {
  castingSlot.value = `${classIndex.value}:${level}:${domain ? "d" : "r"}:${index}`;

  window.clearTimeout(castingTimer);
  castingTimer = window.setTimeout(() => {
    castingSlot.value = "";
  }, 400);
}

const characterClass = computed(() => app.S.cl[classIndex.value] || null);

function ensureClass(c) {
  if (!c) return;

  for (const key of ["base", "used", "dused", "sp"]) {
    if (!Array.isArray(c[key])) c[key] = [];
  }

  if (!Array.isArray(c.domains)) c.domains = [];
  if (!Array.isArray(c.dsel)) c.dsel = [];

  for (let level = 0; level < 10; level++) {
    if (c.base[level] === undefined) c.base[level] = null;
    if (!Number.isFinite(Number(c.used[level]))) c.used[level] = 0;
    if (!Number.isFinite(Number(c.dused[level]))) c.dused[level] = 0;
    if (!Array.isArray(c.sp[level])) c.sp[level] = [];

    for (const spell of c.sp[level]) {
      if (spell.prep === undefined) spell.prep = 0;
      if (spell.left === undefined) spell.left = spell.prep;
      if (spell.dom === undefined) spell.dom = false;
      if (spell.note === undefined) spell.note = "";
      if (spell.dcb === undefined) spell.dcb = 0;
    }
  }
}

watch(
  () => app.S.cl,
  (classes) => {
    classes.forEach(ensureClass);

    if (classIndex.value >= classes.length) {
      classIndex.value = Math.max(0, classes.length - 1);
    }
  },
  { deep: true, immediate: true },
);

watch(characterClass, () => {
  selectedLevel.value = 0;
  openSpell.value = null;
});

const abilityModifier = (c) => Math.floor(((Number(c?.score) || 10) - 10) / 2);

const bonusSlots = (modifier, level) =>
  level >= 1 && modifier >= level ? 1 + Math.floor((modifier - level) / 4) : 0;

function slotInfo(c, level) {
  if (!c) return null;
  ensureClass(c);

  if (level === 0) {
    return {
      level,
      base: Number(c.base[0]) || 0,
      bonus: 0,
      domain: 0,
      regular: 0,
      total: 0,
      atWill: true,
    };
  }

  const base = c.base[level];

  if (base === null || base === undefined || base === "") {
    return null;
  }

  if (c.pre && (Number(c.score) || 10) < 10 + level) {
    return null;
  }

  const bonus = bonusSlots(abilityModifier(c), level);
  const domain = c.dom ? 1 : 0;
  const regular = Math.max(0, Number(base) || 0) + bonus;

  return {
    level,
    base: Number(base) || 0,
    bonus,
    domain,
    regular,
    total: regular + domain,
    atWill: false,
  };
}

function regularUsed(c, level) {
  return Math.max(0, Number(c?.used?.[level]) || 0);
}

function domainUsed(c, level) {
  return Math.max(0, Number(c?.dused?.[level]) || 0);
}

function regularRemaining(c, level) {
  const slots = slotInfo(c, level);
  return slots ? Math.max(0, slots.regular - regularUsed(c, level)) : 0;
}

function domainRemaining(c, level) {
  const slots = slotInfo(c, level);
  return slots ? Math.max(0, slots.domain - domainUsed(c, level)) : 0;
}

function remaining(c, level) {
  return regularRemaining(c, level) + domainRemaining(c, level);
}

function spellDC(c, level, spell = null) {
  return (
    10 +
    level +
    abilityModifier(c) +
    (Number(c?.dcb) || 0) +
    (Number(spell?.dcb) || 0)
  );
}

function preparedCount(c, level) {
  return (c?.sp?.[level] || []).reduce(
    (sum, spell) =>
      sum + (spell.dom ? 0 : Math.max(0, Number(spell.prep) || 0)),
    0,
  );
}

function canPrepare(c, level) {
  const slots = slotInfo(c, level);
  if (!slots || c.type !== "prep") return false;

  const capacity = slots.atWill ? slots.base : slots.regular;
  return preparedCount(c, level) < capacity;
}

function preparedDomainCount(c, level) {
  return (c?.sp?.[level] || []).reduce(
    (sum, spell) =>
      sum + (spell.dom ? Math.max(0, Number(spell.prep) || 0) : 0),
    0
  );
}

function canPrepareDomain(c, level) {
  const slots = slotInfo(c, level);

  return (
    slots.domain > 0 &&
    preparedDomainCount(c, level) < slots.domain
  );
}

const availableLevels = computed(() => {
  const c = characterClass.value;
  if (!c) return [];

  return Array.from({ length: 10 }, (_, level) => ({
    level,
    slots: slotInfo(c, level),
  })).filter(({ slots }) => slots !== null);
});

const levelsToShow = computed(() => {
  if (prepareMode.value) return [selectedLevel.value];
  return availableLevels.value.map(({ level }) => level);
});

function spellsFor(c, level) {
  const spells = c?.sp?.[level] || [];

  // In Cast mode, prepared casters only see prepared spells.
  if (c?.type === "prep" && !prepareMode.value) {
    return spells.filter((spell) => (Number(spell.prep) || 0) > 0 || spell.dom);
  }

  return spells;
}

function spellDetails(name) {
  return (
    (app.S.db || []).find(
      (spell) =>
        String(spell.n || "").toLowerCase() ===
        String(name || "").toLowerCase(),
    ) || null
  );
}

function spellLevelFor(spell, c) {
  const abbreviations = String(c?.abbr || c?.name || "")
    .toLowerCase()
    .split(/[\s,\/]+/)
    .filter(Boolean);

  const expression = /([A-Za-z]+)\s*(\d)/g;
  const levels = [];
  let match;

  while ((match = expression.exec(String(spell?.lv || "")))) {
    if (abbreviations.includes(match[1].toLowerCase())) {
      levels.push(Number(match[2]));
    }
  }

  return levels.length ? Math.min(...levels) : null;
}

function classAliases(c) {
  return String(c?.abbr || "")
    .split(/[\s,\/]+/)
    .filter(Boolean);
}

async function loadCastCatalog(c, level) {
  if (!c) return;

  castCatalogLoading.value = true;

  try {
    const result = await spellStore.loadForCast({
      classAliases: classAliases(c),
      level: String(level),
      domains: c.dom ? c.domains : [],
    });

    castCatalog.value = (result?.rows || []).map((spell) => ({
      ...spell,
      n: spell.n || spell.name,
      s: spell.s || spell.school,
      d: spell.d || spell.descr,
      dom: !!spell.dom,
    }));

    await nextTick();

    if (knownCatalogList.value) {
      knownCatalogList.value.scrollTop = 0;
    }
  } catch (error) {
    console.error("Error cargando catálogo:", error);
    castCatalog.value = [];
  } finally {
    castCatalogLoading.value = false;
  }
}

watch(
  [
    () => characterClass.value?.abbr,
    () => selectedLevel.value,
    () => prepareMode.value,
    () => JSON.stringify(characterClass.value?.domains || []),
    () => characterClass.value?.dom,
  ],
  () => {
    const c = characterClass.value;

    const needsCatalog =
      c &&
      (
        (prepareMode.value && (c.all || (c.dom && c.domains.length))) ||
        c.type === "spont"
      );

    if (needsCatalog) {
      loadCastCatalog(c, selectedLevel.value);
    } else {
      castCatalog.value = [];
    }
  },
  { immediate: true },
);

function knownMax(c, level) {
  const preset = CLASS_TABLES[c?.pre];
  const table = preset?.known;

  if (!table) return null;

  const row = table[(Number(c.lvl) || 1) - 1];
  const value = row?.[level];

  return value === undefined || value === null ? null : value;
}

function knownCount(c, level) {
  return (c?.sp?.[level] || []).filter((spell) => !spell.dom).length;
}

function catalogFor(c, level) {
  const query = catalogSearch.value.trim().toLowerCase();

  return castCatalog.value
    .filter((spell) => {
if (!spell.dom && spellLevelFor(spell, c) !== level) return false;
      if (
        query &&
        !String(spell.n || "")
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }

      return !(c.sp[level] || []).some(
        (known) => known.n.toLowerCase() === spell.n.toLowerCase(),
      );
    })
    .slice(0, 40);
}

function preparationList(c, level) {
  const saved = c?.sp?.[level] || [];

  const savedNames = new Set(
    saved.map((spell) => String(spell.n || "").toLowerCase())
  );

  const fromCatalog = castCatalog.value
    .filter((spell) => {
      // Si la clase no tiene "todos los conjuros",
      // solo mostramos los conjuros procedentes de dominios.
      if (!c?.all && !spell.dom) return false;

      return !savedNames.has(
        String(spell.n || "").toLowerCase()
      );
    })
    .map((spell) => ({
      n: spell.n || spell.name,
      note: "",
      prep: 0,
      left: 0,
      dom: !!spell.dom,
      dcb: 0,
      s: spell.s || spell.school,
      d: spell.d || spell.descr,
      lv: spell.lv,
    }));

  return [...saved, ...fromCatalog];
}

function addSpell(c, level, spell) {
  ensureClass(c);

  if (
    c.sp[level].some((known) => known.n.toLowerCase() === spell.n.toLowerCase())
  ) {
    return;
  }

  const limit = c.type === "spont" ? knownMax(c, level) : null;

  if (limit !== null && knownCount(c, level) >= limit) {
    app.notify("Has alcanzado el máximo de conjuros conocidos de este nivel.");
    return;
  }

  app.snapshot();

  c.sp[level].push({
    n: spell.n,
    s: spell.s || "",
    d: spell.d || "",
    lv: spell.lv || "",
    note: "",
    prep: 0,
    left: 0,
    dom: false,
    dcb: 0,
  });

  app.log("spell", "Spell added", `${spell.n} · ${c.name} · level ${level}`);
  app.notifyUndo(`Conjuro añadido: ${spell.n}`);
}

function spellKey(level, spell) {
  return `${classIndex.value}:${level}:${spell.n}`;
}

function toggleSpell(level, spell) {
  const key = spellKey(level, spell);
  openSpell.value = openSpell.value === key ? null : key;
}

function canCast(c, level, spell) {
  if (c.type !== "spont" && Number(spell.left) <= 0) {
    return false;
  }

  return spell.dom
    ? domainRemaining(c, level) > 0
    : regularRemaining(c, level) > 0;
}

function castSpell(c, level, spell) {
  if (!canCast(c, level, spell)) {
    app.notify("No quedan espacios disponibles para este conjuro.");
    return;
  }

  app.snapshot();

  let usedDomain = false;
  let slotIndex;

  if (spell.dom) {
    if (domainRemaining(c, level) <= 0) {
      app.notify("No quedan espacios de dominio disponibles.");
      return;
    }

    c.dused[level]++;
    usedDomain = true;
    slotIndex = c.dused[level] - 1;
  } else {
    if (regularRemaining(c, level) <= 0) {
      app.notify("No quedan espacios normales disponibles.");
      return;
    }

    c.used[level]++;
    slotIndex = c.used[level] - 1;
  }

  animateSlot(level, usedDomain, slotIndex);

  if (c.type === "prep") {
    spell.left = Math.max(0, (Number(spell.left) || 0) - 1);
  }

  app.log(
    "spell",
    spell.n,
    `${c.name} · level ${level} · DC ${spellDC(c, level, spell)}${usedDomain ? " · domain slot" : ""}`,
  );

  blinkEye();

  effects.offerTrack(spell.n, classIndex.value);
}

function setSlotUsed(c, level, index, domain = false) {
  app.snapshot();

  const key = domain ? "dused" : "used";
  const current = Math.max(0, Number(c[key][level]) || 0);

  // Tap a spent slot to restore it; tap a free slot to spend it.
  c[key][level] = index < current ? index : index + 1;

  app.log(
    "spell",
    domain ? "Domain slot updated" : "Spell slot updated",
    `${c.name} · level ${level}`,
  );

  app.notifyUndo("Espacios de conjuro actualizados");
}

function changePreparation(c, level, spell, delta) {
  const isDomain = !!spell.dom;

  if (delta > 0) {
    const canPrepareSpell = isDomain
      ? canPrepareDomain(c, level)
      : canPrepare(c, level);

    if (!canPrepareSpell) {
      app.notify(
        isDomain
          ? "Ya has preparado el conjuro de dominio de este nivel."
          : "Ya has preparado todos los espacios normales de este nivel."
      );
      return;
    }
  }

  app.snapshot();

  // Si viene del catálogo, guardamos una copia en la lista de la clase.
  if (!c.sp[level].includes(spell)) {
    let savedSpell = c.sp[level].find(
      (known) =>
        String(known.n || "").toLowerCase() ===
        String(spell.n || "").toLowerCase()
    );

    if (!savedSpell) {
      savedSpell = {
        n: spell.n,
        s: spell.s || "",
        d: spell.d || "",
        lv: spell.lv || "",
        note: "",
        prep: 0,
        left: 0,
        dom: isDomain,
        dcb: 0,
      };

      c.sp[level].push(savedSpell);
    }

    spell = savedSpell;
  }

  const previous = Math.max(0, Number(spell.prep) || 0);
  const next = Math.max(0, previous + delta);

  spell.prep = next;

  if (delta > 0) {
    spell.left = Math.min(
      next,
      Math.max(0, Number(spell.left) || 0) + 1
    );
  } else {
    spell.left = Math.min(
      Math.max(0, Number(spell.left) || 0),
      next
    );
  }

  app.log(
    `${delta > 0 ? "Preparado" : "Retirada preparación de"} ${spell.n}`
  );

  app.notifyUndo("Preparación actualizada");
}

function saveNote(c, level, spell, event) {
  const note = event.target.value;
  if (note === (spell.note || "")) return;

  app.snapshot();
  spell.note = note;
  app.log("spell", "Spell note updated", spell.n);
  app.notifyUndo(`Nota actualizada: ${spell.n}`);
}

function changeSpellDC(c, spell, delta) {
  app.snapshot();
  spell.dcb = (Number(spell.dcb) || 0) + delta;

  app.log("spell", "Spell DC modifier updated", spell.n);
  app.notifyUndo(`CD actualizada: ${spell.n}`);
}

async function removeSpell(c, level, spell) {
  const confirmed = await app.ask({
    title: "¿Eliminar conjuro?",
    msg: `Se eliminará ${spell.n} del nivel ${level}.`,
    ok: "Eliminar",
    danger: true,
  });

  if (!confirmed) return;

  app.snapshot();
  const index = c.sp[level].indexOf(spell);

  if (index >= 0) c.sp[level].splice(index, 1);

  openSpell.value = null;
  app.log("spell", "Spell removed", spell.n);
  app.notifyUndo(`Conjuro eliminado: ${spell.n}`);
}

async function rest() {
  const confirmed = await app.ask({
    title: "¿Descansar y recuperar?",
    msg: "Recupera espacios de conjuro, conjuros preparados y usos diarios de objetos. Los efectos con menos de 8 horas restantes terminarán.",
    ok: "Descansar",
  });

  if (!confirmed) return;

  app.snapshot();

  for (const c of app.S.cl) {
    ensureClass(c);

    for (let level = 0; level < 10; level++) {
      c.used[level] = 0;
      c.dused[level] = 0;

      for (const spell of c.sp[level]) {
        spell.left = Math.max(0, Number(spell.prep) || 0);
      }
    }
  }

  for (const item of app.S.items || []) {
    const recovery = item.recovery || (item.daily ? "rest" : "none");

    if (recovery === "rest") {
      item.cur = Math.max(0, Number(item.max) || 0);
    }
  }

  // Resting passes 8 hours (4800 rounds); effects that run out are removed.
  advance(app.S.fx, 4800);
  app.S.fx = app.S.fx.filter((e) => e.rem === null || e.rem > 0);

  app.log(
    "rest",
    "Rested",
    "Slots, prepared spells and daily item uses restored",
  );

  app.notifyUndo("Descanso completado");
}

function selectClass(index) {
  classIndex.value = index;
  selectedLevel.value = 0;
  openSpell.value = null;
}

function selectLevel(level) {
  selectedLevel.value = level;
  openSpell.value = null;
}

function setMode(preparing) {
  prepareMode.value = preparing;
  openSpell.value = null;
}
</script>

<template>
  <div v-if="!app.S.cl.length" class="panel">
    <h2>Aún no hay clases</h2>
    <p class="mute">
      Configura primero una clase lanzadora de conjuros en la sección Setup de
      la versión original.
    </p>
  </div>

  <div v-else-if="characterClass" class="cast-view" :style="classTheme">
    <header class="hdr cast-header">
      <div class="cast-brand">
        <svg
          class="stella-eye"
          :class="{ 'cast-blink': eyeBlinking }"
          viewBox="-4 -4 80 80"
          aria-hidden="true"
        >
          <g class="ring">
            <circle
              cx="36"
              cy="36"
              r="33"
              fill="none"
              stroke="var(--cast-accent)"
              stroke-opacity=".5"
              stroke-width="1.2"
              stroke-dasharray="1.5 4.5"
              stroke-linecap="round"
            />
            <path
              fill="var(--cast-accent)"
              d="M36 -1.5l1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3 3.2-1.3z
      M69 31.5l1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3 3.2-1.3z
      M36 64.5l1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3 3.2-1.3z
      M3 31.5l1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3 3.2-1.3z"
            />
          </g>
          <path
            d="M25 48c-2 6-7 6-6 11M47 48c2 6 7 6 6 11M36 50c0 5-3 6-2 10"
            fill="none"
            stroke="var(--dom)"
            stroke-width="2.6"
            stroke-linecap="round"
          />
          <g class="lid">
            <path
              d="M9 33C19 17 53 17 63 33 53 49 19 49 9 33Z"
              fill="#07040d"
              stroke="var(--cast-accent)"
              stroke-width="2.4"
            />
            <circle cx="36" cy="33" r="10" fill="var(--cast-accent)" />
            <ellipse
              class="pup"
              cx="36"
              cy="33"
              rx="2.6"
              ry="8.4"
              fill="#07040d"
            />
            <circle cx="40" cy="28.5" r="2" fill="#fff" />
          </g>
        </svg>

        <div>
          <h1>{{ app.S.name || "Stella" }}</h1>
          <p class="mute">Lanzamiento de conjuros</p>
        </div>
      </div>
    </header>

    <section v-if="app.S.cl.length > 1" class="panel">
      <div class="chips">
        <button
          v-for="(c, index) in app.S.cl"
          :key="`${c.name}-${index}`"
          class="chip"
          :aria-selected="index === classIndex"
          @click="selectClass(index)"
        >
          {{ c.name || `Clase ${index + 1}` }}
          <span v-if="c.lvl" class="lv">{{ c.lvl }}</span>
        </button>
      </div>
    </section>

    <section v-if="characterClass.type === 'prep'" class="panel">
      <div class="modebar">
        <span class="seg">
          <button :aria-pressed="!prepareMode" @click="setMode(false)">
            Lanzar
          </button>
          <button :aria-pressed="prepareMode" @click="setMode(true)">
            Preparar
          </button>
        </span>
      </div>
    </section>

    <section class="panel">
      <div class="lh">
        <div>
          <h2>{{ characterClass.name }}</h2>
          <p class="mute">
            Nivel {{ characterClass.lvl || "—" }} · Característica
            {{ String(characterClass.ab || "wis").toUpperCase() }}
            {{ characterClass.score ?? 10 }}
            · Modificador {{ abilityModifier(characterClass) >= 0 ? "+" : ""
            }}{{ abilityModifier(characterClass) }}
          </p>
        </div>
      </div>

      <div class="lvbar">
        <button
          v-for="level in 10"
          :key="level - 1"
          class="lvb"
          :class="{ off: !slotInfo(characterClass, level - 1) && level > 1 }"
          :aria-selected="selectedLevel === level - 1"
          :disabled="level > 1 && !slotInfo(characterClass, level - 1)"
          @click="selectLevel(level - 1)"
        >
          <b>{{ level - 1 }}</b>
          <small>
            {{
              level === 1
                ? "∞"
                : slotInfo(characterClass, level - 1)
                  ? remaining(characterClass, level - 1)
                  : "–"
            }}
          </small>
        </button>
      </div>
    </section>

    <FxStrip />

    <section
      v-for="level in levelsToShow"
      :key="`${classIndex}-${level}`"
      class="panel lvs"
    >
      <template v-if="slotInfo(characterClass, level)">
        <div class="lh">
          <div>
            <h2>
              {{ level === 0 ? "Trucos / nivel 0" : `Nivel ${level}` }}
            </h2>

            <p class="mute">
              <template v-if="slotInfo(characterClass, level).atWill">
                A voluntad
              </template>
              <template v-else>
                {{ remaining(characterClass, level) }}
                de
                {{ slotInfo(characterClass, level).total }}
                espacios restantes
                <span v-if="slotInfo(characterClass, level).bonus">
                  · {{ slotInfo(characterClass, level).base }} base +
                  {{ slotInfo(characterClass, level).bonus }} bonificación
                </span>
              </template>
            </p>
          </div>

          <div class="dcb">
            <small>CD</small>
            <b>{{ spellDC(characterClass, level) }}</b>
          </div>
        </div>

        <div v-if="!slotInfo(characterClass, level).atWill" class="slots">
          <button
            v-for="index in slotInfo(characterClass, level).regular"
            :key="`regular-${index}`"
            class="pip"
            :class="{
              spent: index <= regularUsed(characterClass, level),
              pl: castingSlot === `${classIndex}:${level}:r:${index - 1}`,
            }"
            :aria-label="`Espacio normal ${index}`"
            @click="setSlotUsed(characterClass, level, index - 1)"
          />

          <button
            v-for="index in slotInfo(characterClass, level).domain"
            :key="`domain-${index}`"
            class="pip d"
            :class="{
              spent: index <= domainUsed(characterClass, level),
              pl: castingSlot === `${classIndex}:${level}:d:${index - 1}`,
            }"
            aria-label="Espacio de dominio"
            @click="setSlotUsed(characterClass, level, index - 1, true)"
          />
        </div>

<p
  v-if="characterClass.type === 'prep' && !slotInfo(characterClass, level).atWill"
  class="mute note"
>
  Preparados: {{ preparedCount(characterClass, level) }} de
  {{ slotInfo(characterClass, level).regular }} espacios normales.

  <template v-if="slotInfo(characterClass, level).domain">
    · Dominio: {{ preparedDomainCount(characterClass, level) }} de
    {{ slotInfo(characterClass, level).domain }}.
  </template>
</p>

<div
  v-if="prepareMode && (characterClass.all || (characterClass.dom && characterClass.domains?.length))"
  class="catalog"
>          <div v-if="catalogSearch.trim().length >= 2" class="catalog-results">
            <button
              v-for="spell in catalogFor(characterClass, level)"
              :key="spell.n"
              type="button"
              @click="addSpell(characterClass, level, spell)"
            >
              <span>{{ spell.n }}</span>
              <span class="mute">Añadir +</span>
            </button>

            <p v-if="!catalogFor(characterClass, level).length" class="mute">
              No hay resultados para esta búsqueda.
            </p>
          </div>
        </div>
        <p
          v-if="prepareMode && characterClass.all && castCatalogLoading"
          class="mute"
        >
          Cargando conjuros de este nivel...
        </p>
        <div v-if="characterClass.type === 'spont'" class="known-catalog">
          <div class="known-catalog-header">
            <div>
              <h3>Añadir conjuros conocidos</h3>
              <p>
                Conocidos: {{ knownCount(characterClass, selectedLevel) }}
                <template
                  v-if="knownMax(characterClass, selectedLevel) !== null"
                >
                  / {{ knownMax(characterClass, selectedLevel) }}
                </template>
              </p>
            </div>

            <div class="known-catalog-actions">
              <input
                v-model="catalogSearch"
                type="search"
                placeholder="Buscar..."
                class="known-catalog-search"
              />

              <button
                type="button"
                class="known-catalog-toggle"
                @click="showKnownCatalog = !showKnownCatalog"
              >
                {{ showKnownCatalog ? "Ocultar" : "Mostrar" }}
                {{ showKnownCatalog ? "−" : "+" }}
              </button>
            </div>
          </div>

          <template v-if="showKnownCatalog">

          <p v-if="castCatalogLoading" class="mute">Cargando conjuros...</p>

          <div v-else ref="knownCatalogList" class="known-catalog-list">
            <div
              v-for="spell in catalogFor(characterClass, selectedLevel)"
              :key="spell.n"
              class="known-catalog-row"
            >
              <div class="known-catalog-info">
                <span class="known-catalog-name">{{ spell.n }}</span>
                <span v-if="spell.s" class="known-catalog-school">
                  {{ spell.s }}
                </span>
              </div>

<button
  type="button"
  class="known-catalog-add"
  @click="addSpell(characterClass, selectedLevel, spell)"
>
  +
</button>
            </div>

            <p
              v-if="!catalogFor(characterClass, selectedLevel).length"
              class="mute"
            >
              No hay más conjuros disponibles.
            </p>
          </div>
          </template>
        </div>

        <div class="spell-list">
<p
  v-if="!(prepareMode && (characterClass.all || (characterClass.dom && characterClass.domains?.length))
    ? preparationList(characterClass, level).length
    : spellsFor(characterClass, level).length)"
  class="mute"
>            {{
              prepareMode
                ? "No hay conjuros registrados en este nivel."
                : "No hay conjuros preparados o conocidos en este nivel."
            }}
          </p>

          <article
v-for="spell in prepareMode && (characterClass.all || (characterClass.dom && characterClass.domains?.length))
  ? preparationList(characterClass, level)
  : spellsFor(characterClass, level)"
            :key="spell.n"
            class="spell sp"
          >
            <div class="row">
              <button class="nm" @click="toggleSpell(level, spell)">
                <span>{{ spell.n }}</span>
                <span class="sm">
                  <span class="mute"
                    >CD {{ spellDC(characterClass, level, spell) }}</span
                  >
                  <span v-if="spell.dom" class="tag dom">Dominio</span>
                </span>
              </button>

              <span
                v-if="characterClass.type === 'prep' && prepareMode"
                class="step"
              >
                <button
                  :disabled="!spell.prep"
                  aria-label="Preparar menos"
                  @click="changePreparation(characterClass, level, spell, -1)"
                >
                  −
                </button>
                <b>{{ spell.prep || 0 }}</b>
<button
  :disabled="spell.dom
    ? !canPrepareDomain(characterClass, level)
    : !canPrepare(characterClass, level)"
  aria-label="Preparar más"
  @click="changePreparation(characterClass, level, spell, 1)"
>
  +
</button>
              </span>

              <span
                v-else-if="slotInfo(characterClass, level).atWill"
                class="mute"
              >
                A voluntad
              </span>

              <button
                v-else
                class="cast"
                :disabled="!canCast(characterClass, level, spell)"
                @click="castSpell(characterClass, level, spell)"
              >
                Lanzar
              </button>
            </div>

            <div v-if="openSpell === spellKey(level, spell)" class="detail">
              <p v-if="spellDetails(spell.n)?.s" class="mute">
                {{ spellDetails(spell.n).s }}
              </p>

              <p v-if="spellDetails(spell.n)?.d">
                {{ spellDetails(spell.n).d }}
              </p>

              <p v-else class="mute">
                No hay descripción de este conjuro en los datos locales de Vue.
              </p>

              <label class="grid">
                Notas
                <textarea
                  :value="spell.note || ''"
                  rows="2"
                  placeholder="Notas del conjuro"
                  @change="saveNote(characterClass, level, spell, $event)"
                />
              </label>

              <div class="row">
                <span>Modificador adicional de CD</span>
                <span class="step">
                  <button
                    aria-label="Bajar CD"
                    @click="changeSpellDC(characterClass, spell, -1)"
                  >
                    −
                  </button>
                  <b>{{ spell.dcb || 0 }}</b>
                  <button
                    aria-label="Subir CD"
                    @click="changeSpellDC(characterClass, spell, 1)"
                  >
                    +
                  </button>
                </span>
              </div>

              <p v-if="characterClass.type === 'prep'" class="mute">
                Copias restantes: {{ spell.left || 0 }} de
                {{ spell.prep || 0 }} preparadas.
              </p>

              <button
                v-if="!characterClass.all"
                class="danger"
                @click="removeSpell(characterClass, level, spell)"
              >
                Eliminar conjuro de este nivel
              </button>
            </div>
          </article>
        </div>
      </template>

      <template v-else>
        <h2>Nivel {{ level }}</h2>
        <p class="mute">
          No hay espacios disponibles para este nivel con la configuración
          actual.
        </p>
      </template>
    </section>

    <button class="rest" @click="rest">Descansar y recuperar</button>
  </div>
</template>
<style scoped>
.cast-view {
  --cast-accent: #d76bdc;
  --cast-soft: #f09acb;
  --cast-glow: rgba(215, 107, 220, 0.2);
}

.cast-header {
  display: flex;
  align-items: center;
}

.cast-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cast-brand h1 {
  margin: 0;
}

.cast-brand p {
  margin: 4px 0 0;
}

/* Ojo de Stella */
.eye {
  position: relative;
  flex: 0 0 38px;
  width: 38px;
  height: 25px;
  overflow: hidden;
  border: 2px solid var(--cast-accent);
  border-radius: 70% 30% 70% 30%;
  transform: rotate(45deg);
  background: var(--cast-glow);
  box-shadow: 0 0 12px var(--cast-glow);
}

.eye-pupil {
  position: absolute;
  width: 11px;
  height: 11px;
  top: 5px;
  left: 11px;
  border-radius: 50%;
  background: var(--cast-accent);
  transition: transform 0.18s ease;
}

.eye-glint {
  position: absolute;
  top: 7px;
  left: 15px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: white;
}

.eye-lid {
  position: absolute;
  z-index: 2;
  inset: -2px;
  background: var(--cast-accent);
  transform: scaleY(0);
  transform-origin: top;
}

.eye.blinking .eye-lid {
  animation: stella-blink 0.42s ease-in-out;
}

.eye.blinking .eye-pupil {
  transform: scale(0.55);
}

@keyframes stella-blink {
  0%,
  100% {
    transform: scaleY(0);
  }

  45%,
  65% {
    transform: scaleY(1);
  }
}

.cast-view :deep(.spell .nm:focus-visible),
.cast-view :deep(button:focus-visible) {
  outline: 2px solid var(--cast-accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .eye,
  .eye-pupil {
    transition: none;
  }

  .eye.blinking .eye-lid {
    animation-duration: 0.01ms;
  }
}

.stella-eye {
  display: block;
  width: 62px;
  height: 62px;
  flex: 0 0 62px;
  overflow: visible;
}

.stella-eye .ring {
  transform-box: view-box;
  transform-origin: 36px 36px;
}

.stella-eye .lid,
.stella-eye .pup {
  transform-box: fill-box;
  transform-origin: center;
}

@media (prefers-reduced-motion: no-preference) {
  .stella-eye .ring {
    animation: stella-spin 140s linear infinite;
  }

  .stella-eye .pup {
    animation: stella-look 7s ease-in-out infinite;
  }

  .stella-eye .lid {
    animation: stella-blink 6s infinite;
  }
}

@keyframes stella-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes stella-look {
  0%,
  40%,
  100% {
    transform: translateX(0);
  }
  50%,
  60% {
    transform: translateX(6px);
  }
  70%,
  90% {
    transform: translateX(-5px);
  }
}

@keyframes stella-blink {
  0%,
  92%,
  100% {
    transform: scaleY(1);
  }
  96% {
    transform: scaleY(0.1);
  }
}
@media (prefers-reduced-motion: no-preference) {
  .cast-view :deep(.pip.pl) {
    animation: pulse 0.34s ease-out;
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 var(--cast-glow);
  }
  50% {
    transform: scale(1.3);
    box-shadow: 0 0 12px 4px var(--cast-glow);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 transparent;
  }
}

.cast-view :deep(.chip[aria-selected="true"]),
.cast-view :deep(.lvb[aria-selected="true"]),
.cast-view :deep(.modebar button[aria-pressed="true"]) {
  border-color: var(--cast-accent);
  color: var(--cast-accent);
}

.cast-view :deep(.dcb b) {
  color: var(--cast-accent);
}

.cast-view :deep(.pip.pl) {
  position: relative;
  z-index: 1;
  animation: pulse 0.34s ease-out;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 var(--cast-glow);
  }
  50% {
    transform: scale(1.3);
    box-shadow: 0 0 12px 4px var(--cast-glow);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 transparent;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .stella-eye.cast-blink .lid {
    animation: cast-blink 0.42s ease-in-out;
  }
}

@keyframes cast-blink {
  0%,
  100% {
    transform: scaleY(1);
  }
  45%,
  65% {
    transform: scaleY(0.1);
  }
}

/* Selectores de clase, nivel y modo: tonos suaves */
.cast-view :deep(.chip[aria-selected="true"]),
.cast-view :deep(.lvb[aria-selected="true"]),
.cast-view :deep(.modebar button[aria-pressed="true"]) {
  background: color-mix(in srgb, var(--cast-accent) 14%, #171321);
  border-color: var(--cast-accent);
  color: var(--cast-soft);
}

/* Botones inactivos: fondo discreto y texto legible */
.cast-view :deep(.chip),
.cast-view :deep(.lvb),
.cast-view :deep(.modebar button) {
  background: rgba(255, 255, 255, 0.035);
  color: var(--text, #e8e3ef);
  border-color: rgba(255, 255, 255, 0.12);
}

/* Mantener el color de acento en el indicador de CD */
.cast-view :deep(.dcb b) {
  color: var(--cast-soft);
}

/* Catálogo de conjuros conocidos */
.known-catalog {
  margin: 16px 0;
  padding: 14px;
  border: 1px solid rgba(110, 160, 185, 0.22);
  border-radius: 15px;
  background: rgba(5, 15, 23, 0.28);
}

.known-catalog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.known-catalog-header h3 {
  margin: 0;
  font-size: 1rem;
}

.known-catalog-header p {
  margin: 4px 0 0;
  color: var(--mute, #91aab3);
  font-size: 0.82rem;
}

.known-catalog-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-height: 280px;
  overflow-y: auto;
  padding-right: 4px;
}

.known-catalog-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 42px;
  padding: 5px 7px 5px 11px;
  border: 1px solid rgba(110, 160, 185, 0.16);
  border-radius: 9px;
  background: rgba(20, 35, 45, 0.55);
  transition:
    background 0.15s,
    border-color 0.15s;
}

.known-catalog-row:hover {
  background: rgba(40, 65, 80, 0.65);
  border-color: rgba(100, 175, 220, 0.4);
}

.known-catalog-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.known-catalog-name {
  font-size: 0.9rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.known-catalog-school {
  color: var(--mute, #91aab3);
  font-size: 0.72rem;
}

.known-catalog-row > button.known-catalog-add {
  appearance: none;
  -webkit-appearance: none;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;

  width: 24px !important;
  min-width: 24px !important;
  max-width: 24px !important;
  height: 24px !important;
  min-height: 24px !important;
  max-height: 24px !important;

  flex: 0 0 24px !important;
  padding: 0 !important;
  margin: 0 !important;
  box-sizing: border-box;

  border: 1px solid rgba(90, 170, 225, 0.5);
  border-radius: 50%;
  background: rgba(35, 105, 155, 0.2);
  color: #9bd5ff;

  font-size: 15px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
}

.known-catalog-row > button.known-catalog-add:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.known-catalog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.known-catalog-search {
  width: 150px;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid rgba(110, 160, 185, 0.25);
  border-radius: 9px;
  background: rgba(5, 15, 23, 0.65);
  color: inherit;
  font: inherit;
  font-size: 0.82rem;
}

.known-catalog-search:focus {
  outline: none;
  border-color: #65b8ff;
}

.known-catalog-actions {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}

.known-catalog-toggle {
  padding: 7px 10px;
  border: 1px solid rgba(110, 160, 185, 0.25);
  border-radius: 8px;
  background: rgba(35, 105, 155, 0.15);
  color: #9bd5ff;
  font-size: 0.78rem;
  cursor: pointer;
}
</style>
