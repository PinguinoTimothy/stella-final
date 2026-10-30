// Shared condition state. It lives in the campaign storage (`cond`), the same list the cloud already syncs.
export interface ConditionsSnapshot {
  ready: boolean
  readOnly: boolean
  active: string[]
}

export interface ConditionsBridge {
  conditionsSnapshot(): ConditionsSnapshot
  toggleCondition(name: string): ConditionsSnapshot
  clearConditions(): ConditionsSnapshot
}
