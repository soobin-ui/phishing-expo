import uiJson from '../content/ui.json'
import scenariosJson from '../content/scenarios.json'
import type { Scenario, Situation } from '../types'

export const situations = scenariosJson.situations as Situation[]
export const scenarios = scenariosJson.scenarios as unknown as Scenario[]
export const ui = uiJson

/** 고른 상황에 맞는 시나리오. 없으면 첫 번째로 넘어갑니다. */
export function scenarioFor(situationId: string): Scenario {
  return scenarios.find((s) => s.situation === situationId) ?? scenarios[0]
}

/** "오늘 {n}명 참여" 같은 문구의 {자리}를 실제 값으로 채웁니다. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in values ? String(values[key]) : `{${key}}`,
  )
}
