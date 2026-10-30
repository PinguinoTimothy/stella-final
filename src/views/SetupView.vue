```vue
<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app'
import {
  CLASS_TABLES,
  applyClassPreset,
  applyClassTable,
  classModifier,
  classLevel,
  newCasterClass,
} from '../lib/classes'

const app = useAppStore()
const schools = [
  'Abjuration', 'Conjuration', 'Divination', 'Enchantment',
  'Evocation', 'Illusion', 'Necromancy', 'Transmutation', 'Universal',
]

const classes = computed(() => app.S.cl || [])
const presets = Object.entries(CLASS_TABLES)

function ensureClass(c) {
  if (!Array.isArray(c.base)) c.base = Array(10).fill(null)
  if (!Array.isArray(c.used)) c.used = Array(10).fill(0)
  if (!Array.isArray(c.dused)) c.dused = Array(10).fill(0)
  if (!Array.isArray(c.sp)) c.sp = Array.from({ length: 10 }, () => [])
  while (c.base.length < 10) c.base.push(null)
  while (c.used.length < 10) c.used.push(0)
  while (c.dused.length < 10) c.dused.push(0)
  while (c.sp.length < 10) c.sp.push([])
  if (!Array.isArray(c.domains)) c.domains = []
  if (!Array.isArray(c.dsel)) c.dsel = []
  if (!Array.isArray(c.sf)) c.sf = []
  if (c.all === undefined) c.all = false
  return c
}

classes.value.forEach(ensureClass)

function beginChange() {
  app.snapshot()
}

function finishChange(message) {
  app.log('setup', message)
  app.notifyUndo(message)
}

function updateName(event) {
  const value = event.target.value
  if (value === app.S.name) return
  beginChange()
  app.S.name = value
  finishChange('Nombre del personaje actualizado')
}

function updateField(index, key, value) {
  const c = classes.value[index]
  if (!c || c[key] === value) return

  beginChange()
  c[key] = value

  if (key === 'lvl') {
    c.lvl = Math.min(20, Math.max(1, Number(value) || 1))
    if (c.pre) applyClassTable(c)
  }

  finishChange(`${c.name || 'Clase'}: ${key} actualizado`)
}

function updateNumber(index, key, event) {
  const value = event.target.value === '' ? 0 : Number(event.target.value)
  if (!Number.isFinite(value)) return
  updateField(index, key, value)
}

function updateText(index, key, event) {
  updateField(index, key, event.target.value)
}

function updateCheckbox(index, key, event) {
  updateField(index, key, event.target.checked)
}

function changePreset(index, event) {
  const c = classes.value[index]
  const key = event.target.value
  if (!c || c.pre === key) return

  beginChange()
  applyClassPreset(c, key)
  finishChange(`${c.name}: tabla de clase actualizada`)
}

function updateBase(index, level, event) {
  const c = classes.value[index]
  if (!c) return

  const raw = event.target.value
  const value = raw === '' ? null : Math.max(0, Math.floor(Number(raw) || 0))
  if (c.base[level] === value) return

  beginChange()
  c.base[level] = value
  finishChange(`${c.name}: espacios base del nivel ${level} actualizados`)
}

function addClass() {
  beginChange()
  const c = newCasterClass(`Class ${classes.value.length + 1}`)
  app.S.cl.push(c)
  finishChange('Clase lanzadora añadida')
}

async function deleteClass(index) {
  const c = classes.value[index]
  if (!c) return

  const confirmed = await app.ask({
    title: '¿Eliminar esta clase?',
    msg: `Se eliminarán la configuración y los conjuros asociados a ${c.name || 'esta clase'}.`,
    ok: 'Eliminar clase',
    danger: true,
  })
  if (!confirmed) return

  beginChange()
  app.S.cl.splice(index, 1)
  finishChange('Clase lanzadora eliminada')
}

function addDomain(index) {
  beginChange()
  classes.value[index].domains.push({ name: '', parent: '' })
  finishChange('Dominio añadido')
}

function updateDomain(index, domainIndex, key, event) {
  const domain = classes.value[index]?.domains?.[domainIndex]
  if (!domain) return

  const value = event.target.value
  if (domain[key] === value) return

  beginChange()
  domain[key] = value
  finishChange('Dominio actualizado')
}

function removeDomain(index, domainIndex) {
  const c = classes.value[index]
  if (!c?.domains?.[domainIndex]) return

  beginChange()
  c.domains.splice(domainIndex, 1)
  finishChange('Dominio eliminado')
}

function addSchool(index) {
  beginChange()
  classes.value[index].sf.push({ sch: 'Evocation', b: 1 })
  finishChange('Bonificador de escuela añadido')
}

function updateSchool(index, schoolIndex, key, event) {
  const entry = classes.value[index]?.sf?.[schoolIndex]
  if (!entry) return

  const value = key === 'b' ? Number(event.target.value) || 0 : event.target.value
  if (entry[key] === value) return

  beginChange()
  entry[key] = value
  finishChange('Bonificador de escuela actualizado')
}

function removeSchool(index, schoolIndex) {
  beginChange()
  classes.value[index].sf.splice(schoolIndex, 1)
  finishChange('Bonificador de escuela eliminado')
}

function modifierText(c) {
  const value = classModifier(c)
  return `${value >= 0 ? '+' : ''}${value}`
}
</script>

<template>
  <main class="setup-view">
    <button class="setup-back" @click="app.ui.tab = 'more'">
      ← More
    </button>

    <h1>Setup</h1>
    <p class="mute">
      Personaje, clases lanzadoras, espacios, dominios y bonificadores mágicos.
    </p>

    <section class="panel grid">
      <h2>Character</h2>
      <label>
        Nombre del personaje
        <input
          :value="app.S.name"
          placeholder="Nombre del personaje"
          @change="updateName"
        >
      </label>
    </section>

    <section v-if="!classes.length" class="panel">
      <h2>Sin clases lanzadoras</h2>
      <p class="mute">
        Añade una clase para configurar sus espacios y probar Cast.
        También puedes escoger una tabla automática o definir los espacios manualmente.
      </p>
    </section>

    <details
      v-for="(c, index) in classes"
      :key="c.id || index"
      class="panel fold setup-class"
      :open="classes.length === 1"
    >
      <summary>
        <span>{{ c.name || `Clase ${index + 1}` }}</span>
        <span class="mute">
          {{ c.pre ? `Nivel ${classLevel(c)}` : 'Manual' }}
          · mod {{ modifierText(c) }}
        </span>
      </summary>

      <div class="grid setup-fields">
        <label>
          Nombre de la clase
          <input
            :value="c.name"
            placeholder="Ej. Wizard"
            @change="updateText(index, 'name', $event)"
          >
        </label>

        <div class="grid g2">
          <label>
            Tabla de clase
            <select :value="c.pre" @change="changePreset(index, $event)">
              <option value="">Custom (manual)</option>
              <option
                v-for="[key, preset] in presets"
                :key="key"
                :value="key"
              >
                {{ preset.n }}
              </option>
            </select>
          </label>

          <label>
            Nivel de clase
            <input
              type="number"
              min="1"
              max="20"
              :value="c.lvl || 1"
              @change="updateNumber(index, 'lvl', $event)"
            >
          </label>
        </div>

        <div class="grid g2">
          <label>
            Tipo de lanzamiento
            <select
              :value="c.type"
              @change="updateText(index, 'type', $event)"
            >
              <option value="prep">Prepared</option>
              <option value="spont">Spontaneous</option>
            </select>
          </label>

          <label>
            Característica mágica
            <select
              :value="c.ab"
              @change="updateText(index, 'ab', $event)"
            >
              <option value="int">INT</option>
              <option value="wis">WIS</option>
              <option value="cha">CHA</option>
            </select>
          </label>

          <label>
            Puntuación de característica
            <input
              type="number"
              min="1"
              max="50"
              :value="c.score ?? 10"
              @change="updateNumber(index, 'score', $event)"
            >
          </label>

          <label>
            Nivel de lanzador (CL)
            <input
              type="number"
              min="0"
              max="30"
              :value="c.cl ?? 1"
              @change="updateNumber(index, 'cl', $event)"
            >
          </label>

          <label>
            Bonificador general de CD
            <input
              type="number"
              :value="c.dcb || 0"
              @change="updateNumber(index, 'dcb', $event)"
            >
          </label>

          <label>
            Nombres de clases en la base de conjuros
            <input
              :value="c.abbr || ''"
              placeholder="Wizard Wiz"
              @change="updateText(index, 'abbr', $event)"
            >
          </label>
        </div>

        <label class="row setup-check">
          <span>¿Conoce toda su lista de conjuros? (clérigo, druida…)</span>
          <input
            type="checkbox"
            :checked="!!c.all"
            @change="updateCheckbox(index, 'all', $event)"
          >
        </label>

        <label class="row setup-check">
          <span>¿Tiene un espacio de dominio en cada nivel de conjuro (1+)?</span>
          <input
            type="checkbox"
            :checked="!!c.dom"
            @change="updateCheckbox(index, 'dom', $event)"
          >
        </label>

        <section v-if="c.dom" class="setup-subsection">
          <h3>Domains</h3>
          <p class="mute">
            Introduce el nombre del dominio como aparece en tu base de datos.
            Para un subdominio, completa también el dominio padre.
          </p>

          <div
            v-for="(domain, domainIndex) in c.domains"
            :key="domainIndex"
            class="grid g2 setup-domain"
          >
            <label>
              Dominio o subdominio
              <input
                :value="domain.name"
                placeholder="Fire"
                @change="updateDomain(index, domainIndex, 'name', $event)"
              >
            </label>
            <label>
              Dominio padre (si es subdominio)
              <input
                :value="domain.parent"
                placeholder="Destruction"
                @change="updateDomain(index, domainIndex, 'parent', $event)"
              >
            </label>
            <button
              class="danger setup-remove"
              @click="removeDomain(index, domainIndex)"
            >
              Eliminar dominio
            </button>
          </div>

          <button @click="addDomain(index)">+ Añadir dominio</button>
        </section>

        <section class="setup-subsection">
          <h3>Bonificadores de CD por escuela</h3>
          <p class="mute">
            Para dotes como Spell Focus o Greater Spell Focus.
          </p>

          <div
            v-for="(entry, schoolIndex) in c.sf"
            :key="schoolIndex"
            class="row setup-school"
          >
            <select
              :value="entry.sch"
              aria-label="Escuela de magia"
              @change="updateSchool(index, schoolIndex, 'sch', $event)"
            >
              <option v-for="school in schools" :key="school" :value="school">
                {{ school }}
              </option>
            </select>

            <input
              type="number"
              :value="entry.b"
              aria-label="Bonificador de CD"
              @change="updateSchool(index, schoolIndex, 'b', $event)"
            >

            <button
              class="danger"
              aria-label="Eliminar bonificador"
              @click="removeSchool(index, schoolIndex)"
            >
              ×
            </button>
          </div>

          <button @click="addSchool(index)">+ Añadir bonificador</button>
        </section>

        <section class="setup-subsection">
          <h3>Espacios base por día</h3>
          <p class="mute">
            Los valores de la tabla se rellenan automáticamente cuando eliges
            una clase y un nivel. Puedes modificarlos manualmente.
            Deja vacío un nivel al que la clase no tenga acceso.
          </p>

          <div class="setup-slots">
            <label v-for="(value, level) in c.base" :key="level">
              Nivel {{ level }}
              <input
                type="number"
                min="0"
                step="1"
                inputmode="numeric"
                :value="value ?? ''"
                placeholder="—"
                @change="updateBase(index, level, $event)"
              >
            </label>
          </div>
        </section>

        <p v-if="c.pre" class="mute">
          Tabla: {{ CLASS_TABLES[c.pre]?.n }}.
          Nivel de lanzador calculado: {{ c.cl }}.
          Cambiar la clase o el nivel vuelve a calcular los espacios base.
        </p>

        <button class="danger" @click="deleteClass(index)">
          Eliminar esta clase
        </button>
      </div>
    </details>

    <button class="cast setup-add" @click="addClass">
      + Añadir clase lanzadora
    </button>
  </main>
</template>
<style scoped>
.setup-view {
  max-width: 600px;
  margin: 0 auto;
  padding: 16px 14px 100px;
}

.setup-back {
  margin-bottom: 12px;
}

.setup-fields {
  margin-top: 16px;
}

.setup-subsection {
  display: grid;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.setup-subsection h3 {
  margin: 0;
}

.setup-check {
  justify-content: space-between;
  gap: 12px;
}

.setup-check input {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.setup-slots {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.setup-slots label {
  min-width: 0;
  font-size: 13px;
}

.setup-slots input {
  width: 100%;
  min-width: 0;
}

.setup-school {
  gap: 8px;
}

.setup-school select {
  flex: 1;
  min-width: 0;
}

.setup-school input {
  width: 72px;
}

.setup-domain {
  align-items: end;
}

.setup-remove {
  justify-self: start;
}

.setup-add {
  width: 100%;
  margin-top: 12px;
}

@media (max-width: 380px) {
  .setup-slots {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>