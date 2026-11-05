<script setup>
// More › Conditions: reminders only. Marking a condition does not change any number on the sheet.
// Markup and class names are the original ones (h2.pg, input.sr, article.cond, button.ic-eq), so app.css applies.
import { computed, ref } from 'vue';
import { filterConditions } from '../lib/conditions';

const query = ref('');
const list = computed(() => filterConditions(query.value));
</script>

<template>
  <h2 class="pg">Conditions</h2>
  <input v-model="query" class="sr" type="search" placeholder="Search conditions…" aria-label="Search conditions" />

  <div>
    <article v-for="c in list" :key="c.name" class="cond">
      <div class="row">
        <b>{{ c.name }}</b>
      </div>
      <p>{{ c.text }}</p>
    </article>
    <section v-if="!list.length" class="panel item-empty">No condition matches.</section>
  </div>
</template>
