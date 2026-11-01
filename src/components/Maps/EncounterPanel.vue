<script setup>
// The encounter of one room, from the adventure book: text, the labelled parts, and the creatures.
// Creatures open their stat block in the link popup.
import { computed, ref } from 'vue'
import RefLink from '../Refs/RefLink.vue'

const props = defineProps({ room: { type: Object, required: true } })

const LABELS = [
  ['hazard', 'Hazard'],
  ['treasure', 'Treasure'],
  ['development', 'Development'],
  ['creature', 'Creature'],
]
const parts = computed(() => LABELS.filter(([k]) => props.room.text?.[k]).map(([k, label]) => ({ k, label, text: props.room.text[k] })))
const intro = computed(() => props.room.text?.intro || '')
const long = computed(() => intro.value.length > 260)
const expanded = ref(false)
const shown = computed(() => (long.value && !expanded.value ? intro.value.slice(0, 260).trim() + '…' : intro.value))
</script>

<template>
  <section class="enc">
    <header class="enc-head">
      <span class="enc-code">{{ room.code }}</span>
      <strong>{{ room.title }}</strong>
      <span v-if="room.cr" class="enc-cr">CR {{ room.cr }}</span>
    </header>

    <p v-if="shown" class="enc-intro">{{ shown }}
      <button v-if="long" type="button" class="enc-more" @click="expanded = !expanded">{{ expanded ? 'Less' : 'More' }}</button>
    </p>

    <div v-if="room.creatures?.length" class="enc-creatures">
      <div v-for="c in room.creatures" :key="c.name" class="enc-creature">
        <RefLink kind="monster" :name="c.name" />
        <span class="mute"> CR {{ c.cr }}<template v-if="c.xp"> · XP {{ c.xp.toLocaleString('en-US') }}</template></span>
      </div>
    </div>

    <details v-for="p in parts.filter((x) => x.k !== 'creature')" :key="p.k" class="enc-part">
      <summary>{{ p.label }}</summary>
      <p>{{ p.text }}</p>
    </details>

    <p v-if="room.refs?.length" class="enc-refs mute">See area {{ room.refs.join(', ') }}</p>
  </section>
</template>

<style scoped>
.enc {
  padding: 12px;
  border-top: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
  font-size: 14px;
  line-height: 1.5;
}
.enc-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; }
.enc-code {
  padding: 1px 8px;
  border-radius: 8px;
  background: var(--acc);
  color: #111;
  font-weight: 800;
}
.enc-cr { margin-left: auto; color: var(--mute); }
.enc-intro { margin: 8px 0 0; }
.enc-more {
  margin-left: 6px;
  padding: 0 4px;
  background: none;
  border: 0;
  color: var(--acc);
  font: inherit;
  cursor: pointer;
}
.enc-creatures { margin-top: 8px; display: grid; gap: 4px; }
.enc-part { margin-top: 8px; }
.enc-part summary { cursor: pointer; font-weight: 700; color: var(--acc); min-height: 32px; display: flex; align-items: center; }
.enc-part p { margin: 4px 0 0; }
.enc-refs { margin: 8px 0 0; }
</style>
