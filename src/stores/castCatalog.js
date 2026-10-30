// What the Cast screen reads from the spell database: the normal-spell catalog (prepare mode, spontaneous casters)
// and the domain-spell candidates of every visible level. Also the domain-spell actions.
import { defineStore } from 'pinia'
import { nextTick, ref, watch } from 'vue'
import { useAppStore } from './app'
import { useCast } from './cast'
import { useEffects } from './effects'
import { useSpells } from './spells'
import {
  classAliases, domainRemaining, domainUsed, ensureClass, sameName, spellDC, spellLevelFor,
} from '../lib/spellcasting'

const toCatalogSpell = (spell, dom) => ({ ...spell, n: spell.n || spell.name, s: spell.s || spell.school, d: spell.d || spell.descr || spell.description, dom })

export const useCastCatalog = defineStore('castCatalog', () => {
  const app = useAppStore()
  const cast = useCast()
  const effects = useEffects()
  const spells = useSpells()

  const search = ref('')
  const showKnown = ref(true)
  const rows = ref([])
  const loading = ref(false)
  const scrollReset = ref(0)                    // bumped after a reload so the list goes back to the top
  const domainByLevel = ref({})
  const domainLoadingByLevel = ref({})
  let normalRequest = 0, domainRequest = 0

  /* ----- normal spells: needed to add spells in prepare mode ("all spells" classes) and for spontaneous casters ----- */
  watch(
    [() => cast.classIndex, () => cast.characterClass?.abbr, () => cast.characterClass?.type, () => cast.characterClass?.all, () => cast.selectedLevel, () => cast.prepareMode],
    async () => {
      const request = ++normalRequest
      const c = cast.characterClass
      if (!c || !((cast.prepareMode && c.all) || c.type === 'spont')) { rows.value = []; loading.value = false; return }

      loading.value = true
      try {
        const result = await spells.loadForCast({ classAliases: classAliases(c), level: String(cast.selectedLevel), domains: [] })
        if (request !== normalRequest) return
        rows.value = (result?.rows || []).map((s) => toCatalogSpell(s, false))
        await nextTick()
        if (request === normalRequest) scrollReset.value++
      } catch (error) {
        if (request === normalRequest) { console.error('Error cargando catálogo normal:', error); rows.value = [] }
      } finally {
        if (request === normalRequest) loading.value = false
      }
    },
    { immediate: true },
  )

  /* ----- domain candidates, one query per visible level ----- */
  watch(
    [() => cast.classIndex, () => !!cast.characterClass?.dom, () => JSON.stringify(cast.characterClass?.domains || []), () => cast.prepareMode, () => cast.availableLevels.map(({ level }) => level).join(',')],
    async () => {
      const request = ++domainRequest
      const c = cast.characterClass
      domainByLevel.value = {}
      domainLoadingByLevel.value = {}
      if (!c || !c.dom || cast.prepareMode || !c.domains?.length) return

      const levels = cast.availableLevels.map(({ level }) => level).filter((l) => l >= 1)
      domainLoadingByLevel.value = Object.fromEntries(levels.map((l) => [l, true]))

      await Promise.all(levels.map(async (level) => {
        try {
          const list = await spells.loadDomainCandidates({ domains: c.domains || [], level: String(level) })
          if (request !== domainRequest) return
          domainByLevel.value = { ...domainByLevel.value, [level]: (list || []).map((s) => toCatalogSpell(s, true)) }
        } catch (error) {
          if (request === domainRequest) {
            console.error(`Error cargando conjuros de dominio de nivel ${level}:`, error)
            domainByLevel.value = { ...domainByLevel.value, [level]: [] }
          }
        } finally {
          if (request === domainRequest) domainLoadingByLevel.value = { ...domainLoadingByLevel.value, [level]: false }
        }
      }))
    },
    { immediate: true },
  )

  /* ----- descriptions and durations are fetched by name for every spell on screen ----- */
  watch(
    () => {
      const c = cast.characterClass
      if (!c) return ''
      const names = []
      for (const level of cast.levelsToShow) for (const sp of c.sp?.[level] || []) if (sp?.n) names.push(sp.n)
      for (const list of Object.values(domainByLevel.value)) for (const sp of list || []) if (sp?.n) names.push(sp.n)
      return [...new Set(names)].join('|')
    },
    (joined) => { if (joined) spells.ensure(joined.split('|')) },
    { immediate: true },
  )

  /** Catalog spells of `level` for class `c` that match the search and are not already in its list (max 40). */
  function catalogFor(c, level) {
    const q = search.value.trim().toLowerCase()
    return rows.value
      .filter((spell) => {
        const name = String(spell.n || spell.name || '')
        if (!name || spell.dom || spellLevelFor(spell, c) !== Number(level)) return false
        if (q && !name.toLowerCase().includes(q)) return false
        return !(c?.sp?.[level] || []).some((k) => !k.dom && sameName(k.n, name))
      })
      .slice(0, 40)
  }

  /* ----- domain spells: independent of the class list and of preparation ----- */
  const domainFor = (level) => domainByLevel.value[level] || []
  const isDomainLoading = (level) => !!domainLoadingByLevel.value[level]

  function selectedDomainSpell(c, level) {
    const list = domainFor(level)
    if (!list.length) return null
    const picked = String(c?.dsel?.[level] || '').toLowerCase()
    return list.find((s) => String(s.n || s.name || '').toLowerCase() === picked) || list[0]
  }

  function selectDomainSpell(c, level, name) {
    ensureClass(c)
    const exists = domainFor(level).some((s) => String(s.n || s.name || '') === String(name || ''))
    if (!exists || c.dsel[level] === name) return
    app.snapshot()
    c.dsel[level] = name
    cast.openDomainSpell = null
  }

  const domainSpellKey = (level, spell) => (spell ? `${cast.classIndex}:${level}:${spell.n || spell.name || ''}` : null)
  function toggleDomainSpell(level, spell) {
    const key = domainSpellKey(level, spell)
    if (!key) return
    cast.openDomainSpell = cast.openDomainSpell === key ? null : key
  }

  const canCastDomain = (c, level) => !!selectedDomainSpell(c, level) && domainRemaining(c, level) > 0

  function castDomainSpell(c, level) {
    const spell = selectedDomainSpell(c, level)
    if (!spell) { app.notify('No hay un conjuro de dominio disponible para este nivel.'); return }
    if (!canCastDomain(c, level)) { app.notify('No quedan espacios de dominio disponibles.'); return }

    ensureClass(c)
    app.snapshot()
    c.dused[level] = domainUsed(c, level) + 1
    cast.animateSlot(level, true, c.dused[level] - 1)

    const name = spell.n || spell.name
    app.log('spell', name, `${c.name} · level ${level} · DC ${spellDC(c, level, spell)} · domain slot`)
    cast.blinkEye()
    effects.offerTrack(name, cast.classIndex)
  }

  return {
    search, showKnown, rows, loading, scrollReset,
    catalogFor, domainFor, isDomainLoading, selectedDomainSpell, selectDomainSpell, domainSpellKey, toggleDomainSpell, canCastDomain, castDomainSpell,
  }
})
