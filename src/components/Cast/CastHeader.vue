<script setup>
// Stella's eye (it blinks when you cast) + the character name.
import { useAppStore } from '../../stores/app'
import { useCast } from '../../stores/cast'

const app = useAppStore()
const cast = useCast()
</script>

<template>
  <header class="hdr cast-header">
    <div class="cast-brand">
      <svg class="stella-eye" :class="{ 'cast-blink': cast.eyeBlinking }" viewBox="-4 -4 80 80" aria-hidden="true">
        <g class="ring">
          <circle cx="36" cy="36" r="33" fill="none" stroke="var(--cast-accent)" stroke-opacity=".5" stroke-width="1.2" stroke-dasharray="1.5 4.5" stroke-linecap="round" />
          <path
            fill="var(--cast-accent)"
            d="M36 -1.5l1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3 3.2-1.3z
      M69 31.5l1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3 3.2-1.3z
      M36 64.5l1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3 3.2-1.3z
      M3 31.5l1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3 3.2-1.3z"
          />
        </g>
        <path d="M25 48c-2 6-7 6-6 11M47 48c2 6 7 6 6 11M36 50c0 5-3 6-2 10" fill="none" stroke="var(--dom)" stroke-width="2.6" stroke-linecap="round" />
        <g class="lid">
          <path d="M9 33C19 17 53 17 63 33 53 49 19 49 9 33Z" fill="#07040d" stroke="var(--cast-accent)" stroke-width="2.4" />
          <circle cx="36" cy="33" r="10" fill="var(--cast-accent)" />
          <ellipse class="pup" cx="36" cy="33" rx="2.6" ry="8.4" fill="#07040d" />
          <circle cx="40" cy="28.5" r="2" fill="#fff" />
        </g>
      </svg>

      <div>
        <h1>{{ app.S.name || 'Stella' }}</h1>
        <p class="mute">Lanzamiento de conjuros</p>
      </div>
    </div>
  </header>
</template>

<style scoped>
.cast-header { display: flex; align-items: center; }
.cast-brand { display: flex; align-items: center; gap: 12px; }
.cast-brand h1 { margin: 0; }
.cast-brand p { margin: 4px 0 0; }

.stella-eye { display: block; width: 62px; height: 62px; flex: 0 0 62px; overflow: visible; }
.stella-eye .ring { transform-box: view-box; transform-origin: 36px 36px; }
.stella-eye .lid, .stella-eye .pup { transform-box: fill-box; transform-origin: center; }

@media (prefers-reduced-motion: no-preference) {
  .stella-eye .ring { animation: stella-spin 140s linear infinite; }
  .stella-eye .pup { animation: stella-look 7s ease-in-out infinite; }
  .stella-eye .lid { animation: stella-blink 6s infinite; }
}

@keyframes stella-spin { to { transform: rotate(360deg); } }
@keyframes stella-look {
  0%, 40%, 100% { transform: translateX(0); }
  50%, 60% { transform: translateX(6px); }
  70%, 90% { transform: translateX(-5px); }
}
@keyframes stella-blink {
  0%, 92%, 100% { transform: scaleY(1); }
  96% { transform: scaleY(0.1); }
}
</style>
