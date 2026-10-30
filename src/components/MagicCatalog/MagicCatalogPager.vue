<script setup lang="ts">
defineProps<{ page: number; pages: number }>()
const emit = defineEmits<{ change: [page: number] }>()
</script>
<template>
  <nav v-if="pages > 1" class="magic-pager" aria-label="Catalog pages"><button type="button" :disabled="page <= 0" aria-label="Previous page" @click="emit('change', page - 1)">‹</button><span>Page {{ page + 1 }} of {{ pages }}</span><button type="button" :disabled="page >= pages - 1" aria-label="Next page" @click="emit('change', page + 1)">›</button></nav>
</template>
