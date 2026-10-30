<script setup>
// One line of the log: what happened, the detail under it, and the time on the right.
import { timeLabel } from '../../lib/history'
defineProps({ entry: { type: Object, required: true } })
</script>

<template>
  <div class="hrow">
    <span>
      <b>{{ entry.m }}</b>
      <small v-if="entry.d">{{ entry.d }}</small>
    </span>
    <small>{{ timeLabel(entry.t) }}</small>
  </div>
</template>
