// Standalone storage for the condition reminders. It does not depend on any campaign store.
// Cloud sync is not connected yet: this list stays on this device until it is wired to your store.
import type { ConditionsBridge, ConditionsSnapshot } from '../types/conditions'

const KEY = 'stellas-conditions-v1'

function read(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(value) ? value.map(item => String(item)) : []
  } catch {
    return []
  }
}
function write(list: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* storage unavailable */ }
}
function snapshot(): ConditionsSnapshot {
  return { ready: true, readOnly: false, active: read() }
}

export const conditionsStore: ConditionsBridge = {
  conditionsSnapshot: snapshot,
  toggleCondition(name) {
    const list = read(), at = list.indexOf(name)
    if (at < 0) list.push(name); else list.splice(at, 1)
    write(list)
    return snapshot()
  },
  clearConditions() {
    write([])
    return snapshot()
  },
}
