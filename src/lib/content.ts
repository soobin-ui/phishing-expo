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
 * 성을 뺀 이름 — 전수빈 → 수빈, 남궁민수 → 민수, 이든 → 이든.
 * 한글 이름은 뒤의 두 글자를 이름으로 봅니다(두 글자면 그대로). 한글이 아니면 그대로 둡니다.
 * 가족 잠금화면의 "금쪽같은 내새끼 수빈♥" 같은 자리에 씁니다.
 */
export function givenName(name: string): string {
  const n = name.trim()
  if (!/^[가-힣]+$/.test(n)) return n
  return n.length >= 3 ? n.slice(-2) : n
}

/**
 * 시나리오 글의 {name} 자리에 관람객 이름을 넣습니다 — 제목·본문·맺음말·서명·대화·받은편지함·잠금화면 알림 전부.
 * {given} 은 성을 뺀 이름입니다(givenName).
 * redFlags 의 match 는 건드리지 않습니다(이름이 들어간 문장을 수상한 문구로 잡지 않도록).
 * 이름이 비어 있으면(시연용 바로가기 등) ui.name.fallback 을 씁니다.
 */
/** 부르는 말 — 받침이 있으면 '아', 없으면 '야' (수빈 → 수빈아, 지수 → 지수야). 한글이 아니면 그대로. */
export function callName(given: string): string {
  const code = given.charCodeAt(given.length - 1)
  if (code < 0xac00 || code > 0xd7a3) return given
  return given + ((code - 0xac00) % 28 ? '아' : '야')
}

export function personalize(scenario: Scenario, name: string): Scenario {
  const full = name.trim() || ui.name.fallback
  const given = givenName(full)
  const v = { name: full, given, givenCall: callName(given) }
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
    lockscreen: scenario.lockscreen?.map((n) => ({ ...n, from: fill(n.from, v), text: fill(n.text, v) })),
    brief: scenario.brief
      ? { title: fill(scenario.brief.title, v), steps: scenario.brief.steps.map((t) => fill(t, v)) }
      : undefined,
  }
}
