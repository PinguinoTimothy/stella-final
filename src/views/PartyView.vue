
<script setup>
import { computed, ref } from 'vue'
import { useAppStore } from '../stores/app'
import { fmtR } from '../lib/effects'

const app = useAppStore()
const props = defineProps({
  readonly: { type: Boolean, default: false }
})
const newName = ref('')
const selectedName = ref('')
const showAdd = ref(false)

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

function manageInventory() {
  if (!selected.value) return

  app.ui.owner = selected.value.name
  app.ui.itemView = 'inventory'
  app.ui.search = ''
  app.ui.tab = 'items'
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
<button v-if="!props.readonly" @click="manageInventory">
  Gestionar objetos
</button>
        </div>

        <p v-if="!selected.items.length" class="mute">
          No tiene objetos asignados.
        </p>

        <div v-else class="party-items">
          <article
            v-for="item in selected.items"
            :key="item.id"
            class="party-item"
          >
            <b>{{ item.n }}</b>
            <span class="mute">{{ item.k || 'Objeto' }}</span>
            <span v-if="item.equipped" class="tag dom">Equipado</span>
          </article>
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

.party-items {
  display: grid;
  gap: 10px;
}

.party-item {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line, rgba(255,255,255,.1));
}

.party-item b {
  flex: 1 1 130px;
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
