<script setup>
import { computed } from 'vue';
import { useAppStore } from '../stores/app';
import { ICON } from '../lib/constants';

const app = useAppStore();

const params = new URLSearchParams(window.location.search);
const isPlayerMode = Boolean(params.get('src') || params.has('view'));

const tabs = isPlayerMode
  ? [
      ['items', 'Items'],
      ['fx', 'Efectos Activos'],
      ['party', 'Party'],
      ['more', 'Mas'],
    ]
  : [
      ['cast', 'Cast'],
      ['fx', 'Efectos Activos'],
      ['db', 'Spells'],
      ['items', 'Items'],
      ['more', 'Mas'],
    ];

const moreTabs = isPlayerMode
  ? ['more', 'skills', 'umr', 'grapple', 'conditions', 'history', 'magicCatalog']
  : ['more', 'party', 'skills', 'umr', 'grapple', 'conditions', 'history', 'magicCatalog', 'setup'];

function active(key) {
  return app.ui.tab === key || (key === 'more' && moreTabs.includes(app.ui.tab));
}

const activeIndex = computed(() => tabs.findIndex(([key]) => active(key)));
const indicatorStyle = computed(() => {
  const i = activeIndex.value;
  const n = tabs.length;
  return {
    opacity: i < 0 ? 0 : 1,
    left: `calc(${Math.max(i, 0)} * 100% / ${n} + (100% / ${n} - 34px) / 2)`,
  };
});

function go(tab) {
  app.ui.tab = tab;
  window.scrollTo(0, 0);
}
</script>

<template>
  <nav class="nav" aria-label="Sections">
    <div class="nav-in" :style="{ gridTemplateColumns: `repeat(${tabs.length},1fr)` }">
      <span class="ind" :style="indicatorStyle" aria-hidden="true" />
      <button
        v-for="[key, label] in tabs"
        :key="key"
        :aria-current="active(key) ? 'page' : 'false'"
        :aria-selected="active(key)"
        @click="go(key)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <component :is="shape.tag" v-for="(shape, index) in ICON[key] || []" :key="index" v-bind="shape.attrs" />
        </svg>
        {{ label }}
      </button>
    </div>
  </nav>
</template>

<style scoped>
.nav-in {
  position: relative;
}

/* the sliding bar replaces the per-button bar */
.nav-in button::before {
  content: none;
}

.ind {
  position: absolute;
  top: 0;
  width: 34px;
  height: 3px;
  border-radius: 0 0 3px 3px;
  background: var(--acc);
  box-shadow: 0 0 12px var(--acc);
  pointer-events: none;
  transition:
    left 0.45s cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 0.2s ease;
}

@media (prefers-reduced-motion: reduce) {
  .ind {
    transition: none;
  }
}
</style>
