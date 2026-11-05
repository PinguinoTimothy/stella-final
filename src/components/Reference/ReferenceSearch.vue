<script setup>
// Reference search: one box for monsters, spells, magic items, conditions, skills and monster rules.
// Matches names only. Read-only in every mode. Opens with the "/" key or the Search button.
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import CombatCard from '../Monsters/CombatCard.vue';
import SpellInfo from '../SpellInfo.vue';
import { combatSummary, crLabel, fetchMonsterDetail, fetchMonsterPage } from '../../lib/monsters';
import { M_SPELL, fromRow } from '../../lib/mapping';
import { MAGIC_SELECT, localConditions, localRules, localSkills, namesContaining } from '../../lib/reference';

const LIMIT = 6;
const MAGIC_FIELDS = [
  ['Group', 'group_name'],
  ['Slot', 'slot'],
  ['Price', 'price'],
  ['Weight', 'weight'],
  ['Aura', 'aura'],
  ['Caster level', 'cl'],
  ['Requirements', 'requirements'],
  ['Cost', 'cost'],
  ['Source', 'source'],
];

const open = ref(false);
const query = ref('');
const inputEl = ref(null);
const groups = ref([]); // [{ kind, label, items: [{ kind, title, sub, data }] }]
const busy = ref(false);
const detail = ref(null); // { kind, title, data } or, for monsters, { loading, card, error }

let searchToken = 0; // ignores answers that arrive after the query changed
let openToken = 0; // ignores monster details that arrive after the panel moved on
let timer = null;

const isTyping = el =>
  !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

function show() {
  open.value = true;
  nextTick(() => inputEl.value?.focus());
}

function close() {
  open.value = false;
  detail.value = null;
  openToken++;
}

function back() {
  detail.value = null;
  openToken++;
  nextTick(() => inputEl.value?.focus());
}

function localGroups(q) {
  return [
    {
      kind: 'condition',
      label: 'Conditions',
      items: localConditions(q)
        .slice(0, LIMIT)
        .map(c => ({
          kind: 'condition',
          title: c.name,
          sub: '',
          data: c,
        })),
    },
    {
      kind: 'skill',
      label: 'Skills',
      items: localSkills(q)
        .slice(0, LIMIT)
        .map(s => ({
          kind: 'skill',
          title: s.name,
          sub: s.tags.join(' · '),
          data: s,
        })),
    },
    {
      kind: 'rule',
      label: 'Monster rules',
      items: localRules(q)
        .slice(0, LIMIT)
        .map(r => ({
          kind: 'rule',
          title: r[0],
          sub: `${r[2]} · ${r[1]}`,
          data: r,
        })),
    },
  ];
}

async function remoteGroups(q) {
  const [m, s, i] = await Promise.allSettled([
    fetchMonsterPage({ query: q, limit: LIMIT }),
    namesContaining('spells', q, LIMIT, { filters: { custom: 'eq.false' } }),
    namesContaining('magic_items', q, LIMIT, { select: MAGIC_SELECT }),
  ]);
  const monsters = m.status === 'fulfilled' ? m.value.rows : [];
  const spells = s.status === 'fulfilled' ? s.value : [];
  const magic = i.status === 'fulfilled' ? i.value : [];

  return [
    {
      kind: 'monster',
      label: 'Monsters',
      items: monsters.map(row => ({
        kind: 'monster',
        title: row.name,
        sub: `CR ${crLabel(row.cr)} · ${row.size} ${row.type} · HP ${row.hp} · AC ${row.ac}`,
        data: row,
      })),
    },
    {
      kind: 'spell',
      label: 'Spells',
      items: spells.map(row => {
        const spell = fromRow(row, M_SPELL);
        return {
          kind: 'spell',
          title: spell.n,
          sub: [spell.lv, spell.s].filter(Boolean).join(' · '),
          data: spell,
        };
      }),
    },
    {
      kind: 'magic',
      label: 'Magic items',
      items: magic.map(row => ({
        kind: 'magic',
        title: row.name,
        sub: [row.group_name, row.slot, row.price].filter(Boolean).join(' · '),
        data: row,
      })),
    },
  ];
}

watch(query, value => {
  clearTimeout(timer);
  const q = value.trim();
  const id = ++searchToken;
  if (q.length < 2) {
    groups.value = [];
    busy.value = false;
    return;
  }
  groups.value = localGroups(q); // instant: no network needed
  busy.value = true;
  timer = setTimeout(async () => {
    const remote = await remoteGroups(q).catch(() => []);
    if (id !== searchToken) return;
    groups.value = [...remote, ...localGroups(q)];
    busy.value = false;
  }, 250);
});

async function openResult(r) {
  const id = ++openToken;
  if (r.kind !== 'monster') {
    detail.value = { kind: r.kind, title: r.title, data: r.data };
    return;
  }
  detail.value = { kind: 'monster', title: r.title, loading: true, card: null, error: '' };
  try {
    const data = await fetchMonsterDetail(r.data.url);
    if (id !== openToken || !detail.value) return;
    if (data) detail.value.card = combatSummary(data);
    else detail.value.error = 'This monster is not in the database.';
  } catch {
    if (id === openToken && detail.value) detail.value.error = 'Could not load this monster.';
  } finally {
    if (id === openToken && detail.value) detail.value.loading = false;
  }
}

const magicFields = row =>
  MAGIC_FIELDS.filter(([, key]) => row[key] !== null && row[key] !== undefined && row[key] !== '').map(
    ([label, key]) => [label, row[key]],
  );

function onKey(e) {
  if (e.key === 'Escape' && open.value) {
    e.preventDefault();
    if (detail.value) back();
    else close();
    return;
  }
  if (e.key === '/' && !open.value && !isTyping(e.target)) {
    e.preventDefault();
    show();
  }
}

onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey);
  clearTimeout(timer);
});
</script>

<template>
  <button class="ref-open" type="button" aria-label="Search reference (/)" title="Search reference (/)" @click="show">
    Search
  </button>

  <div v-if="open" class="ref-bg" @click.self="close">
    <section class="ref-modal" role="dialog" aria-modal="true" aria-label="Reference search">
      <header class="ref-head">
        <button v-if="detail" class="back" type="button" @click="back">‹ Results</button>
        <input
          v-else
          ref="inputEl"
          v-model="query"
          type="search"
          placeholder="Search by name…"
          aria-label="Search reference"
          autocomplete="off"
        />
        <button class="x" type="button" aria-label="Close" @click="close">×</button>
      </header>

      <div class="ref-body">
        <!-- Details -->
        <template v-if="detail">
          <h2>{{ detail.title }}</h2>

          <template v-if="detail.kind === 'monster'">
            <p v-if="detail.loading" class="mute">Loading…</p>
            <p v-else-if="detail.error" class="mute" role="alert">
              {{ detail.error }}
            </p>
            <CombatCard v-else-if="detail.card" :card="detail.card" />
          </template>

          <template v-else-if="detail.kind === 'spell'">
            <p class="mute">
              {{ detail.data.lv }}
            </p>
            <SpellInfo :spell="detail.data" />
          </template>

          <template v-else-if="detail.kind === 'magic'">
            <ul class="grl">
              <li v-for="[label, value] in magicFields(detail.data)" :key="label">
                <b>{{ label }}</b> {{ value }}
              </li>
            </ul>
            <p v-if="detail.data.descr">
              {{ detail.data.descr }}
            </p>
          </template>

          <template v-else-if="detail.kind === 'condition'">
            <p>{{ detail.data.text }}</p>
          </template>

          <template v-else-if="detail.kind === 'skill'">
            <p class="mute">
              {{ detail.data.tags.join(' · ') }}
            </p>
            <section v-for="[title, items] in detail.data.sections" :key="title" class="ref-sec">
              <h3>{{ title }}</h3>
              <ul class="grl">
                <li v-for="(it, i) in items" :key="i">
                  {{ it.t ?? [it.l, it.v, it.x, it.n && `(${it.n})`].filter(Boolean).join(' ') }}
                </li>
              </ul>
            </section>
          </template>

          <template v-else-if="detail.kind === 'rule'">
            <p class="mute">{{ detail.data[2] }} · {{ detail.data[1] }}</p>
            <p>{{ detail.data[3] }}</p>
          </template>
        </template>

        <!-- Results -->
        <template v-else>
          <p v-if="query.trim().length < 2" class="mute">
            Type at least 2 letters. Tip: press / anywhere to open this search.
          </p>
          <p v-else-if="busy" class="mute">Buscando...</p>

          <section v-for="g in groups" v-show="g.items.length" :key="g.kind" class="ref-group">
            <h3>{{ g.label }}</h3>
            <button v-for="(r, i) in g.items" :key="g.kind + i" class="more-row" type="button" @click="openResult(r)">
              <span>
                <b>{{ r.title }}</b>
                <small v-if="r.sub">{{ r.sub }}</small>
              </span>
              <i aria-hidden="true">›</i>
            </button>
          </section>

          <p v-if="query.trim().length >= 2 && !busy && !groups.some(g => g.items.length)" class="mute">No results.</p>
        </template>
      </div>
    </section>
  </div>
</template>

<style scoped>
.ref-open {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 35;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 14px;
}

.ref-bg {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.55);
}

.ref-modal {
  width: min(640px, 100%);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  background: var(--surface, #11222d);
  border: 1px solid var(--line, #264452);
  border-radius: 18px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.ref-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-bottom: 1px solid var(--line, #264452);
}

.ref-head input {
  flex: 1;
  min-width: 0;
}

.ref-head .x {
  min-width: 36px;
  min-height: 36px;
}

.ref-body {
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 12px 16px 18px;
}

.ref-body h2 {
  margin: 0 0 6px;
}

.ref-group {
  margin-top: 12px;
}

.ref-group h3 {
  margin: 0 0 6px;
}

.ref-sec {
  margin-top: 12px;
}

.ref-sec h3 {
  margin: 0 0 4px;
}
</style>

<style>
/* Keeps the search button clear of the combat panel on desktop. */
@media (min-width: 900px) {
  body.has-combat .ref-open {
    right: calc(var(--combat-w, 380px) + 10px);
  }
}
</style>
