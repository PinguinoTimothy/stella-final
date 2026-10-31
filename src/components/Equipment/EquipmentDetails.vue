<script setup>
// Details sheet: the catalog row, plus stats and effects read from the database when it opens.
import { computed, onMounted, ref } from 'vue'
import { fetchEquipmentDetail } from '../../lib/supabase'
import { formatPrice, formatWeight, plainText } from '../../lib/equipment'

const props = defineProps({ row: Object, readOnly: Boolean })
const emit = defineEmits(['close', 'add'])

const loading = ref(true)
const error = ref('')
const stats = ref([])
const effects = ref([])
const description = computed(() => plainText(props.row.body_md))

onMounted(async () => {
  try {
    const d = await fetchEquipmentDetail(props.row.base_id)
    stats.value = d.stats
    effects.value = d.effects
  } catch {
    error.value = 'Could not load the stats. Check your connection.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="modal-backdrop magic-modal" role="presentation" @click.self="emit('close')">
    <section class="magic-details" role="dialog" aria-modal="true" aria-label="Equipment details">
      <header>
        <h2>{{ row.name }}</h2>
        <button class="icon-button" type="button" aria-label="Close" @click="emit('close')">×</button>
      </header>

      <dl>
        <dt>Category</dt><dd>{{ row.category || '—' }}</dd>
        <dt>Price</dt><dd>{{ formatPrice(row.price_gp) }}</dd>
        <dt>Weight</dt><dd>{{ formatWeight(row.weight_lb) }}</dd>
        <dt v-if="row.sources">Source</dt><dd v-if="row.sources">{{ row.sources }}</dd>
        <template v-for="s in stats" :key="s.seq">
          <dt>{{ s.key }}<small v-if="s.section"> ({{ s.section }})</small></dt>
          <dd>{{ s.value_raw }}</dd>
        </template>
      </dl>

      <p v-if="loading" class="mute">Loading stats…</p>
      <p v-if="error" class="mute" role="status">{{ error }}</p>

      <ul v-if="effects.length" class="magic-effects">
        <li v-for="e in effects" :key="e.seq">
          <b v-if="e.qualifier">{{ e.qualifier }}</b> {{ e.text }}
        </li>
      </ul>

      <p v-if="description" class="magic-description">{{ description }}</p>

      <button v-if="!readOnly" class="primary magic-add-detail" type="button" @click="emit('add')">Add to inventory</button>
    </section>
  </div>
</template>
