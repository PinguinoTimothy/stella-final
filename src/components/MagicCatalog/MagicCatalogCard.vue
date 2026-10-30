<script setup lang="ts">
import type { MagicCatalogItem } from '../../types/inventory'
defineProps<{ item: MagicCatalogItem; kind: string; readOnly: boolean }>()
const emit = defineEmits<{ details: []; add: [] }>()
const paths: Record<string,string> = {
  Weapon:'<path d="M14.5 5.5L19 4l-1.5 4.5L9 17l-2-2z"/><path d="M6 14l4 4M8 16l-3.5 3.5"/>',
  Armor:'<path d="M8 4l-5 3 2 4 3-1v10h8V10l3 1 2-4-5-3c-.5 1.5-2 2.5-4 2.5S8.5 5.5 8 4z"/>',
  Shield:'<path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z"/>',
  Ring:'<circle cx="12" cy="15" r="5.5"/><path d="M9.5 6.5L12 3l2.5 3.5L12 9z"/>',
  Wand:'<path d="M4 20L15 9M16 3l1.1 2.4L19.5 6.5l-2.4 1.1L16 10l-1.1-2.4L12.5 6.5l2.4-1.1z"/>',
  Staff:'<path d="M6 21L15 12M15.5 4.5l4 4-3.5 3.5-4-4z"/>',
  Scroll:'<rect x="6" y="4" width="12" height="16" rx="2"/><path d="M9 9h6M9 13h6"/>',
  Potion:'<path d="M10 3h4M11 3v5l-5 9a3 3 0 0 0 2.6 4.5h6.8A3 3 0 0 0 18 17l-5-9V3M8.5 14h7"/>',
}
const glyph = (kind: string) => paths[kind] || '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"/>'
</script>
<template>
  <article class="item-card ic" :data-c="kind === 'Weapon' || kind === 'Armor' || kind === 'Shield' ? 'gear' : ['Wand','Staff','Rod','Metamagic rod'].includes(kind) ? 'charged' : ['Scroll','Potion'].includes(kind) ? 'use' : 'worn'">
    <div class="ic-row">
      <button class="ic-main" type="button" @click="emit('details')">
        <span class="ti" aria-hidden="true"><svg viewBox="0 0 24 24" v-html="glyph(kind)" /></span>
        <span class="ic-tx"><span class="ic-t"><span>{{ item.n }}</span></span><span class="ic-m"><span>{{ item.group || 'Magic item' }}</span><span v-if="item.slot && !/^(none|—|-)$/i.test(item.slot)" class="tag">{{ item.slot }}</span></span><span v-if="item.d" class="ic-n">{{ item.d }}</span></span>
      </button>
    </div>
    <div class="ic-use"><span class="ic-l cat-price">{{ item.price || 'No price' }}</span><button v-if="!readOnly" class="cast" type="button" @click="emit('add')">Add</button></div>
  </article>
</template>
