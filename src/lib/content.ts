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

/**
 * 시나리오 글의 {name} 자리에 관람객 이름을 넣습니다 — 제목·본문·맺음말·서명·대화·받은편지함 전부.
 * redFlags 의 match 는 건드리지 않습니다(이름이 들어간 문장을 수상한 문구로 잡지 않도록).
 * 이름이 비어 있으면(시연용 바로가기 등) ui.name.fallback 을 씁니다.
 */
export function personalize(scenario: Scenario, name: string): Scenario {
  const v = { name: name.trim() || ui.name.fallback }
  const f = <T extends string | undefined>(t: T): T => (t === undefined ? t : (fill(t, v) as T))
  return {
    ...scenario,
    subject: f(scenario.subject),
    body: f(scenario.body),
    closing: f(scenario.closing),
    signature: f(scenario.signature),
    turns: scenario.turns.map((t) => ({ ...t, message: fill(t.message, v) })),
    inbox: scenario.inbox?.map((d) => ({
      ...d,
      subject: f(d.subject),
      body: f(d.body),
      closing: f(d.closing),
      signature: f(d.signature),
    })),
  }
}
