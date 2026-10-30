<script setup>
// More › Conditions: reminders only. Marking a condition does not change any number on the sheet.
// Markup and class names are the original ones (h2.pg, input.sr, article.cond, button.ic-eq), so app.css applies.
import { computed, ref } from 'vue'
import { useAppStore } from '../stores/app'
import { filterConditions } from '../lib/conditions'
import BackButton from '../components/BackButton.vue'

const app = useAppStore()
const query = ref('')
const readOnly = computed(() => app.viewer)
const active = computed(() => app.S.cond || [])
const on = computed(() => new Set(active.value))
const list = computed(() => filterConditions(query.value, active.value))

function toggle(name) {
  if (readOnly.value) return
  if (!app.S.cond) app.S.cond = []
  const at = app.S.cond.indexOf(name)
  if (at < 0) app.S.cond.push(name)
  else app.S.cond.splice(at, 1)
}

async function clearAll() {
  if (readOnly.value || !active.value.length) return
  const ok = await app.ask({ title: 'Clear all conditions?', msg: 'Every active condition will be unmarked.', ok: 'Clear', danger: true })
  if (ok) app.S.cond = []
}
</script>

<template>
  <BackButton />
  <h2 class="pg">Conditions</h2>
  <p class="mute">
    Reminders only: marking a condition does not change any number on the sheet.
    <template v-if="active.length">{{ active.length }} active.</template>
  </p>
  <input v-model="query" class="sr" type="search" placeholder="Search conditions…" aria-label="Search conditions">

  <div>
    <article v-for="c in list" :key="c.name" class="cond" :class="{ on: on.has(c.name) }">
      <div class="row">
        <b>{{ c.name }}</b>
        <button
          v-if="!readOnly"
          class="ic-eq"
          type="button"
          :aria-pressed="on.has(c.name)"
          @click="toggle(c.name)"
        >
          {{ on.has(c.name) ? 'Active' : 'Mark active' }}
        </button>
        <span v-else-if="on.has(c.name)" class="tag dom">active</span>
      </div>
      <p>{{ c.text }}</p>
    </article>
    <section v-if="!list.length" class="panel item-empty">No condition matches.</section>
  </div>

  <button v-if="!readOnly && active.length" type="button" @click="clearAll">
    Clear all active conditions
  </button>
</template>