
<script setup>
import { computed, ref, watch } from 'vue'
import { useAppStore } from '../stores/app'
import { fmtR } from '../lib/effects'
import { cmpItem } from '../lib/items'
import ItemCard from '../components/ItemCard.vue'
import ItemDetail from '../components/ItemDetail.vue'
import ItemForm from '../components/ItemForm.vue'
import Sheet from '../components/Sheet.vue'

const app = useAppStore()
const props = defineProps({
  readonly: { type: Boolean, default: false }
})
const newName = ref('')
const selectedName = ref('')
const showAdd = ref(false)
const detailId = ref(null)   // item open in the detail sheet
const form = ref(null)       // null = closed · { item } = edit
const pickerOpen = ref(false) // "Añadir objeto" sheet
const pickerQuery = ref('')

const members = computed(() =>
  app.party.map((name) => {
    const items = app.S.items.filter((item) => item.owner === name)
    const effects = app.S.fx.filter((effect) => affects(effect, name))

    return {
      name,
      items,
      equipped: items.filter((item) => item.equipped).length,
      effects,
    }
  }),
)

const selected = computed(() =>
  members.value.find((member) => member.name === selectedName.value) || null,
)

// Same order as the Items screen: equipped first, then by name.
const sortedItems = computed(() =>
  selected.value ? [...selected.value.items].sort(cmpItem) : [],
)

const detail = computed(() =>
  app.S.items.find((it) => it.id === detailId.value) || null,
)
// If the open item disappears (deleted, undo…), close its sheet.
watch(detail, (d) => { if (!d) detailId.value = null })
// Switching character closes the picker.
watch(selectedName, () => { pickerOpen.value = false; pickerQuery.value = '' })

/* Add-item picker: items not carried by this character, split into unassigned and carried by others. */
const pickerRows = computed(() => {
  const name = selected.value?.name
  const q = pickerQuery.value.trim().toLowerCase()
  const rows = app.S.items
    .filter((it) => it.owner !== name)
    .filter((it) => !q || [it.n, it.k, it.slot, it.owner, it.aura].join(' ').toLowerCase().includes(q))
    .sort((a, b) => String(a.n).localeCompare(String(b.n)))
  return {
    free: rows.filter((it) => !it.owner),
    held: rows.filter((it) => it.owner),
  }
})

function openPicker() {
  if (props.readonly || !selected.value) return
  pickerQuery.value = ''
  pickerOpen.value = true
}

/* Assigns an item to the open character. Taking it from someone else unequips it, like the original. */
function assign(item) {
  if (props.readonly || !selected.value) return
  const name = selected.value.name
  if (item.owner === name) return
  const prev = item.owner
  app.snapshot()
  item.owner = name
  if (prev) item.equipped = false
  const msg = prev ? `Moved ${item.n} from ${prev} to ${name}` : `Assigned ${item.n} to ${name}`
  app.log('party', msg)
  app.notifyUndo(msg)
  pickerOpen.value = false
}

function edit(item) {
  if (props.readonly) return
  detailId.value = null
  form.value = { item }
}

function affects(effect, name) {
  const target = name.toLowerCase()

  return (
    (effect.targets || []).some(
      (item) => String(item).toLowerCase() === target,
    ) ||
    String(effect.tg || '').toLowerCase().includes(target)
  )
}

function addMember() {
  const name = newName.value.trim()

  if (!name) {
    app.notify('Escribe el nombre del personaje.')
    return
  }

  if (app.party.some((item) => item.toLowerCase() === name.toLowerCase())) {
    app.notify('Ya existe un personaje con ese nombre.')
    return
  }

  app.snapshot()
  app.party.push(name)
  app.log('party', 'Character added', name)
  newName.value = ''
  showAdd.value = false
  app.notifyUndo(`Añadido: ${name}`)
}

async function removeMember(member) {
  const confirmed = await app.ask({
    title: '¿Retirar personaje?',
    msg: `${member.name} saldrá del grupo. Sus objetos quedarán sin asignar.`,
    ok: 'Retirar',
    danger: true,
  })

  if (!confirmed) return

  app.snapshot()

  for (const item of app.S.items) {
    if (item.owner === member.name) {
      item.owner = ''
      item.equipped = false
    }
  }

  app.party.splice(app.party.indexOf(member.name), 1)
  selectedName.value = ''
  app.log('party', 'Character removed', member.name)
  app.notifyUndo(`Retirado: ${member.name}`)
}

</script>

<template>
  <main class="party-view">
    <template v-if="!selected">
      <header class="page-head">
        <h1>Grupo</h1>
<button v-if="!props.readonly" class="cast" @click="showAdd = !showAdd">          {{ showAdd ? 'Cancelar' : '+ Personaje' }}
        </button>
      </header>

<form
  v-if="showAdd && !props.readonly"
        class="panel"
        @submit.prevent="addMember"
      >
        <label for="party-name">Nombre del personaje</label>
        <div class="add-row">
          <input
            id="party-name"
            v-model="newName"
            placeholder="Ej. Valeros"
            autocomplete="off"
          />
          <button class="cast" type="submit">Añadir</button>
        </div>
      </form>

      <section v-if="members.length" class="party-list">
        <button
          v-for="member in members"
          :key="member.name"
          class="more-row"
          @click="selectedName = member.name"
        >
          <span>
            <b>{{ member.name }}</b>
            <small>
              {{ member.items.length }} objetos ·
              {{ member.equipped }} equipados ·
              {{ member.effects.length }} efectos
            </small>
          </span>
          <i aria-hidden="true">›</i>
        </button>
      </section>

      <section v-else class="panel item-empty">
<h2>El grupo está vacío</h2>
<p class="mute">
  {{ props.readonly
    ? 'No hay personajes publicados.'
    : 'Añade un personaje para empezar a organizar el grupo.' }}
</p>
      </section>
    </template>

    <template v-else>
      <button class="back" @click="selectedName = ''">
        ‹ Volver al grupo
      </button>

      <header class="page-head">
        <div>
          <h1>{{ selected.name }}</h1>
          <p class="mute">
            {{ selected.items.length }} objetos ·
            {{ selected.equipped }} equipados
          </p>
        </div>
      </header>

      <section class="panel">
        <div class="row">
          <h2>Inventario</h2>
<button v-if="!props.readonly" class="cast" style="margin: 1rem;" @click="openPicker">
  + Añadir objeto
</button>
        </div>

        <p v-if="!selected.items.length" class="mute">
          No tiene objetos asignados.
        </p>

        <div v-else class="item-grid">
          <ItemCard
            v-for="it in sortedItems"
            :key="it.id"
            :item="it"
            :readonly="props.readonly"
            hide-owner
            @open="detailId = it.id"
          />
        </div>
      </section>

      <section class="panel">
        <h2>Efectos activos</h2>

        <p v-if="!selected.effects.length" class="mute">
          No tiene efectos registrados.
        </p>

        <article
          v-for="effect in selected.effects"
          :key="effect.id"
          class="party-effect"
          :class="effect.k"
        >
          <div class="row">
            <b>{{ effect.n }}</b>
            <span class="mute">
              {{ effect.rem == null ? 'Permanente' : effect.rem === 0 ? 'Terminado' : `${fmtR(effect.rem)} restantes` }}
            </span>
          </div>
          <p v-if="effect.note" class="mute">{{ effect.note }}</p>
        </article>
      </section>

<button
  v-if="!props.readonly"
  class="danger wide"
  @click="removeMember(selected)"
>
  Retirar {{ selected.name }} del grupo
</button>
    </template>

    <ItemDetail
      v-if="detail"
      :item="detail"
      :readonly="props.readonly"
      @close="detailId = null"
      @edit="edit"
    />
    <ItemForm
      v-if="form && !props.readonly"
      :item="form.item"
      @close="form = null"
    />

    <Sheet
      v-if="pickerOpen && selected && !props.readonly"
      :title="`Añadir objeto a ${selected.name}`"
      @close="pickerOpen = false"
    >
      <input
        v-model="pickerQuery"
        type="search"
        placeholder="Buscar objetos…"
        aria-label="Buscar objetos"
        autocomplete="off"
      >

      <p v-if="!pickerRows.free.length && !pickerRows.held.length" class="item-empty">
        Todos los objetos ya están con {{ selected.name }}.
        Crea objetos nuevos desde la pestaña Objetos.
      </p>

      <section v-if="pickerRows.free.length" class="pk-g">
        <h3 class="ig-h">Sin asignar <span>{{ pickerRows.free.length }}</span></h3>
        <article v-for="it in pickerRows.free" :key="it.id" class="pk">
          <span class="pk-t">
            <b>{{ it.n }}</b>
            <small>
              <span>{{ it.k || 'Objeto' }}</span>
              <span v-if="it.slot && it.slot !== it.k" class="tag">{{ it.slot }}</span>
            </small>
          </span>
          <button @click="assign(it)">Asignar</button>
        </article>
      </section>

      <section v-if="pickerRows.held.length" class="pk-g">
        <h3 class="ig-h">Llevados por otros <span>{{ pickerRows.held.length }}</span></h3>
        <article v-for="it in pickerRows.held" :key="it.id" class="pk">
          <span class="pk-t">
            <b>{{ it.n }}</b>
            <small>
              <span>{{ it.k || 'Objeto' }}</span>
              <span class="tag">con {{ it.owner }}</span>
            </small>
          </span>
          <button @click="assign(it)">Quitar</button>
        </article>
      </section>
    </Sheet>
  </main>
</template>

<style scoped>
.party-view {
  padding-bottom: 90px;
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 16px 0;
}

.page-head h1 {
  margin: 0;
}

.party-list {
  display: grid;
  gap: 8px;
}

.party-effect {
  padding: 12px 0;
  border-bottom: 1px solid var(--line, rgba(255,255,255,.1));
}

.party-effect.buff {
  border-left: 3px solid var(--good, #62bd91);
  padding-left: 10px;
}

.party-effect.debuff {
  border-left: 3px solid var(--danger, #e47777);
  padding-left: 10px;
}

.party-effect p {
  margin-bottom: 0;
}

.add-row {
  display: flex;
  gap: 8px;
}

.add-row input {
  min-width: 0;
  flex: 1;
}
</style>