// The Cast screen: which class and level is open, and everything you can DO there.
// Components only call these actions. Rules live in lib/spellcasting.js.
import { defineStore } from 'pinia'
import { computed, nextTick, ref, watch } from 'vue'
import { useAppStore } from './app'
import { useEffects } from './effects'
import { useSpells } from './spells'
import { advance } from '../lib/effects'
import {
  canCast, canPrepare, ensureClass, knownCount, knownMax, newClassSpell, regularUsed, sameName, slotInfo, spellDC,
} from '../lib/spellcasting'

export const useCast = defineStore('cast', () => {
  const app = useAppStore()
  const effects = useEffects()
  const spells = useSpells()

  /* ----- screen state ----- */
  const classIndex = ref(0)
  const selectedLevel = ref(0)
  const prepareMode = ref(false)
  const openSpell = ref(null)
  const openDomainSpell = ref(null)
  const castingSlot = ref('')
  const eyeBlinking = ref(false)
  let castingTimer = 0

  const characterClass = computed(() => app.S.cl?.[classIndex.value] || null)

  const availableLevels = computed(() => {
    const c = characterClass.value
    if (!c) return []
    return Array.from({ length: 10 }, (_, level) => ({ level, slots: slotInfo(c, level) })).filter(({ slots }) => slots !== null)
  })
  const levelsToShow = computed(() => (prepareMode.value ? [selectedLevel.value] : availableLevels.value.map(({ level }) => level)))

  watch(() => app.S.cl, (classes) => {
    const list = Array.isArray(classes) ? classes : []
    list.forEach(ensureClass)
    if (classIndex.value >= list.length) classIndex.value = Math.max(0, list.length - 1)
  }, { deep: true, immediate: true })

  const closeDetails = () => { openSpell.value = null; openDomainSpell.value = null }
  watch(characterClass, () => { selectedLevel.value = 0; closeDetails() })

  function selectClass(index) { classIndex.value = index; selectedLevel.value = 0; closeDetails() }
  function selectLevel(level) { selectedLevel.value = level; closeDetails() }
  function setMode(preparing) { prepareMode.value = preparing; closeDetails() }

  const spellKey = (level, spell) => `${classIndex.value}:${level}:${spell.n}`
  function toggleSpell(level, spell) {
    if (!spell || spell.dom) return
    const key = spellKey(level, spell)
    openSpell.value = openSpell.value === key ? null : key
  }

  /* ----- feedback: the eye blinks and the slot pulses ----- */
  async function blinkEye() {
    eyeBlinking.value = false
    await nextTick()
    eyeBlinking.value = true
    window.setTimeout(() => { eyeBlinking.value = false }, 450)
  }
  function animateSlot(level, domain, index) {
    castingSlot.value = `${classIndex.value}:${level}:${domain ? 'd' : 'r'}:${index}`
    window.clearTimeout(castingTimer)
    castingTimer = window.setTimeout(() => { castingSlot.value = '' }, 400)
  }

  /** Spell facts for the info block: class copy + the spell database (custom first, then the catalog). */
  function spellDetails(name) { return (app.S.db || []).find((s) => sameName(s.n || s.name, name)) || null }
  function fullSpell(spell) {
    const d = spellDetails(spell?.n || spell?.name) || spells.find(spell?.n || spell?.name) || {}
    return { ...d, ...spell, n: spell.n || spell.name, d: spell.d || d.d || '', s: spell.s || d.s || '', dom: d.domain || '' }
  }

  /* ----- casting ----- */
  function castSpell(c, level, spell) {
    if (!spell || spell.dom) return
    if (!canCast(c, level, spell)) { app.notify('No quedan espacios normales disponibles para este conjuro.'); return }

    ensureClass(c)
    app.snapshot()
    c.used[level] = regularUsed(c, level) + 1
    animateSlot(level, false, c.used[level] - 1)
    if (c.type === 'prep') spell.left = Math.max(0, (Number(spell.left) || 0) - 1)

    app.log('spell', spell.n, `${c.name} · level ${level} · DC ${spellDC(c, level, spell)}`)
    blinkEye()
    effects.offerTrack(spell.n, classIndex.value)
  }

  /** Tap a spent slot to restore it; tap a free slot to spend it. */
  function setSlotUsed(c, level, index, domain = false) {
    ensureClass(c)
    const slots = slotInfo(c, level)
    const capacity = domain ? slots?.domain || 0 : slots?.regular || 0
    if (!slots || index < 0 || index >= capacity) return

    app.snapshot()
    const key = domain ? 'dused' : 'used'
    const current = Math.max(0, Number(c[key][level]) || 0)
    c[key][level] = index < current ? index : index + 1
    app.log('spell', domain ? 'Domain slot updated' : 'Spell slot updated', `${c.name} · level ${level}`)
    app.notifyUndo('Espacios de conjuro actualizados')
  }

  /* ----- the class spell list ----- */
  function addSpell(c, level, spell) {
    if (!spell || spell.dom) return
    ensureClass(c)
    const name = String(spell.n || spell.name || '').trim()
    if (!name) return
    if (c.sp[level].some((k) => !k.dom && sameName(k.n, name))) return

    const limit = c.type === 'spont' ? knownMax(c, level) : null
    if (limit !== null && knownCount(c, level) >= limit) { app.notify('Has alcanzado el máximo de conjuros conocidos de este nivel.'); return }

    app.snapshot()
    c.sp[level].push(newClassSpell(spell))
    app.log('spell', 'Spell added', `${name} · ${c.name} · level ${level}`)
    app.notifyUndo(`Conjuro añadido: ${name}`)
  }

  function changePreparation(c, level, spell, delta) {
    if (!spell || spell.dom) return
    ensureClass(c)
    if (delta > 0 && !canPrepare(c, level)) { app.notify('Ya has preparado todos los espacios normales de este nivel.'); return }

    app.snapshot()
    // A spell picked from the catalog is saved into the class list the first time it is prepared.
    if (!c.sp[level].includes(spell)) {
      let saved = c.sp[level].find((k) => !k.dom && sameName(k.n, spell.n))
      if (!saved) { saved = newClassSpell(spell); c.sp[level].push(saved) }
      spell = saved
    }

    const next = Math.max(0, Math.max(0, Number(spell.prep) || 0) + delta)
    spell.prep = next
    const left = Math.max(0, Number(spell.left) || 0)
    spell.left = delta > 0 ? Math.min(next, left + 1) : Math.min(left, next)

    app.log(`${delta > 0 ? 'Preparado' : 'Retirada preparación de'} ${spell.n}`)
    app.notifyUndo('Preparación actualizada')
  }

  function saveNote(c, level, spell, event) {
    const note = event.target.value
    if (note === (spell.note || '')) return
    app.snapshot()
    spell.note = note
    app.log('spell', 'Spell note updated', spell.n)
    app.notifyUndo(`Nota actualizada: ${spell.n}`)
  }

  function changeSpellDC(c, spell, delta) {
    app.snapshot()
    spell.dcb = (Number(spell.dcb) || 0) + delta
    app.log('spell', 'Spell DC modifier updated', spell.n)
    app.notifyUndo(`CD actualizada: ${spell.n}`)
  }

  async function removeSpell(c, level, spell) {
    if (!spell || spell.dom) return
    const ok = await app.ask({ title: '¿Eliminar conjuro?', msg: `Se eliminará ${spell.n} del nivel ${level}.`, ok: 'Eliminar', danger: true })
    if (!ok) return
    app.snapshot()
    const i = c.sp[level].indexOf(spell)
    if (i >= 0) c.sp[level].splice(i, 1)
    openSpell.value = null
    app.log('spell', 'Spell removed', spell.n)
    app.notifyUndo(`Conjuro eliminado: ${spell.n}`)
  }

  /* ----- long rest ----- */
  async function rest() {
    const ok = await app.ask({
      title: '¿Descansar y recuperar?',
      msg: 'Recupera espacios de conjuro, conjuros preparados y usos diarios de objetos. Los efectos con menos de 8 horas restantes terminarán.',
      ok: 'Descansar',
    })
    if (!ok) return
    app.snapshot()

    for (const c of app.S.cl || []) {
      ensureClass(c)
      for (let level = 0; level < 10; level++) {
        c.used[level] = 0
        c.dused[level] = 0
        // Legacy domain records are not prepared spells and are left untouched.
        for (const s of c.sp[level]) if (!s.dom) s.left = Math.max(0, Number(s.prep) || 0)
      }
    }

    for (const it of app.S.items || []) {
      if ((it.recovery || (it.daily ? 'rest' : 'none')) === 'rest') it.cur = Math.max(0, Number(it.max) || 0)
    }

    // Resting passes 8 hours (4800 rounds); effects that run out are removed.
    if (!Array.isArray(app.S.fx)) app.S.fx = []
    advance(app.S.fx, 4800)
    app.S.fx = app.S.fx.filter((e) => e.rem === null || e.rem > 0)

    app.log('rest', 'Rested', 'Slots, prepared spells and daily item uses restored')
    app.notifyUndo('Descanso completado')
  }

  return {
    classIndex, selectedLevel, prepareMode, openSpell, openDomainSpell, castingSlot, eyeBlinking,
    characterClass, availableLevels, levelsToShow,
    selectClass, selectLevel, setMode, spellKey, toggleSpell, fullSpell,
    animateSlot, blinkEye, castSpell, setSlotUsed, addSpell, changePreparation, saveNote, changeSpellDC, removeSpell, rest,
  }
})
