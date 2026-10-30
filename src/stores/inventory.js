// Everything you can DO to an item. Components only call these actions.
import { defineStore } from 'pinia'
import { useAppStore } from './app'
import { uid } from '../lib/format'
import { curOf, maxOf, qtyOf, newItem, equipInto, defaultSlot } from '../lib/items'

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

/** Cleans up form values the same way the single-file version did when saving. */
export function normalize(d) {
  const o = { ...d }
  o.n = String(o.n || '').trim()
  o.qty = Math.max(1, parseInt(o.qty, 10) || 1)
  o.max = Math.max(0, parseInt(o.max, 10) || 0)
  o.cur = clamp(parseInt(o.cur, 10) || 0, 0, o.max)
  o.recovery = o.max > 0 ? (o.recovery || 'none') : 'none'
  o.daily = o.recovery === 'rest'
  o.cl = Math.max(1, parseInt(o.cl, 10) || 1)
  o.spellLevel = clamp(parseInt(o.spellLevel, 10) || 0, 0, 9)
  o.price = Math.max(0, parseFloat(o.price) || 0)
  o.weight = Math.max(0, parseFloat(o.weight) || 0)
  o.icl = Math.max(0, parseInt(o.icl, 10) || 0)
  o.spellName = String(o.spellName || '').trim()
  o.aura = String(o.aura || '').trim()
  o.o = String(o.o || '').trim()
  if (o.equipped && !o.slot) o.slot = defaultSlot(o)
  return o
}

export const useInventory = defineStore('inventory', () => {
  const app = useAppStore()
  const index = (it) => app.S.items.indexOf(it)

  function useCharge(it, d) {
    if (d < 0) app.snapshot()
    const max = maxOf(it)
    it.cur = clamp(curOf(it) + d, 0, max)
    if (d < 0) {
      app.log('item', 'Used a charge of ' + it.n, it.cur + '/' + max + ' left')
      app.notifyUndo(`${it.n}: ${it.cur}/${max} charges left`)
    }
  }

  function setCharges(it, n) { it.cur = clamp(parseInt(n, 10) || 0, 0, maxOf(it)) }

  function refill(it) {
    app.snapshot(); it.cur = maxOf(it)
    app.log('item', it.n + ' recharged', it.cur + '/' + it.max)
    app.notifyUndo(it.n + ' recharged')
  }

  async function remove(it, { confirm = true } = {}) {
    if (confirm && !(await app.ask({ title: 'Delete item?', msg: it.n + ' will be deleted.', ok: 'Delete', danger: true }))) return false
    app.snapshot(); app.S.items.splice(index(it), 1)
    app.notifyUndo('Deleted ' + it.n)
    return true
  }

  async function adjustQty(it, d) {
    const nq = qtyOf(it) + d
    if (nq < 1) {
      const ok = await app.ask({ title: 'Remove item?', msg: `That was the last one. Remove ${it.n} from the inventory?`, ok: 'Remove', danger: true })
      if (!ok) return
      app.snapshot(); app.log('item', 'Used the last ' + it.n)
      app.S.items.splice(index(it), 1); app.notifyUndo('Removed ' + it.n)
      return
    }
    if (d < 0) {
      app.snapshot()
      app.log('item', (it.k === 'Potion' || it.k === 'Scroll' ? 'Used ' : 'Spent ') + it.n, nq + ' left')
      app.notifyUndo(`${it.n}: ${nq} left`)
    }
    it.qty = nq
  }

  function toggleEquip(it) {
    app.snapshot()
    if (it.equipped) {
      it.equipped = false
      app.log('item', it.n + ' unequipped')
      app.notifyUndo(it.n + ' unequipped')
      return
    }
    const out = equipInto(app.S.items, it, defaultSlot(it))
    app.log('item', it.n + ' equipped', out.length ? 'Replaced ' + out.join(', ') : it.slot === 'Slotless' ? '' : it.slot)
    app.notifyUndo(it.n + ' equipped' + (out.length ? ', replaced ' + out.join(', ') : ''))
  }

  function duplicate(it) {
    app.snapshot()
    const copy = JSON.parse(JSON.stringify(it))
    copy.id = uid(); copy.equipped = false; copy.cur = copy.max
    app.S.items.splice(index(it) + 1, 0, copy)
    app.notifyUndo('Copied ' + it.n)
    return copy
  }

  function add(data) {
    const it = newItem(normalize(data))
    if (!it.n) return null
    app.snapshot()
    if (it.equipped) { it.equipped = false; app.S.items.push(it); equipInto(app.S.items, it, it.slot || defaultSlot(it)) }
    else app.S.items.push(it)
    app.log('item', 'Added ' + it.n)
    app.notifyUndo('Added ' + it.n)
    return it
  }

  function update(it, data) {
    const d = normalize(data)
    if (!d.n) return false
    app.snapshot()
    const wasEquipped = it.equipped
    Object.assign(it, d, { equipped: wasEquipped })
    if (d.equipped && !wasEquipped) equipInto(app.S.items, it, it.slot || defaultSlot(it))
    else if (!d.equipped) it.equipped = false
    return true
  }

  return { useCharge, setCharges, refill, remove, adjustQty, toggleEquip, duplicate, add, update }
})
