
import { SB_ANON, fetchRev, fetchAll } from './supabase'
import { fromRow, M_ITEM } from './mapping'

export async function fetchLiveView() {
  const revision = await fetchRev(SB_ANON)

  if (!revision) return null

  const [characters, wallets, items, effects, settings] = await Promise.all([
    fetchAll(SB_ANON, 'characters', 'select=*', 'name'),
    fetchAll(SB_ANON, 'wallets', 'select=*', 'owner'),
    fetchAll(SB_ANON, 'items', 'select=*', 'id'),
    fetchAll(
      SB_ANON,
      'effects',
      'select=id,position,name,kind,target,targets,rem,tot,cl',
      'id'
    ),
    fetchAll(SB_ANON, 'settings', 'select=*', 'key')
  ])
  const byPosition = (rows) =>
    rows.slice().sort((a, b) => (a.position || 0) - (b.position || 0))

  const data = {
    name: '',
    party: byPosition(characters).map((row) => row.name),
    items: byPosition(items).map((row) => fromRow(row, M_ITEM)),
    money: {},
    fx: [],
    log: [],
    cond: []
  }

  wallets.forEach((row) => {
    if (row.owner === '') {
      data.money = {
        pp: row.pp,
        gp: row.gp,
        sp: row.sp,
        cp: row.cp
      }
    }
  })

  data.fx = byPosition(effects).map((row) => ({
    id: row.id,
    n: row.name,
    k: row.kind,
    tg: row.target,
    targets: (row.targets || []).filter(
      (target) => !/^Personaje \d+$/.test(target)
    ),
    rem: row.rem,
    tot: row.tot,
    cl: row.cl
  }))

  settings.forEach((row) => {
    if (row.key === 'name') data.name = row.value || ''
    if (row.key === 'history') {
      data.log = Array.isArray(row.value) ? row.value : []
    }
    if (row.key === 'conditions') {
      data.cond = Array.isArray(row.value) ? row.value : []
    }
  })

  return {
    revision: Number(revision.rev),
    updatedAt: revision.updated_at,
    data
  }
}
