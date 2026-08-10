import uiJson from '../content/ui.json'
import scenariosJson from '../content/scenarios.json'
import quizzesJson from '../content/quizzes.json'
import type { AgeGroup, QuizItem, Scenario } from '../types'

export const ageGroups = scenariosJson.ageGroups as AgeGroup[]
export const scenarios = scenariosJson.scenarios as unknown as Scenario[]
export const quizzes = quizzesJson.quizzes as unknown as QuizItem[]
export const ui = uiJson

/** 고른 연령대에 맞는 시나리오. 없으면 첫 번째로 넘어갑니다. */
export function scenarioFor(ageGroupId: string): Scenario {
  return scenarios.find((s) => s.ageGroup === ageGroupId) ?? scenarios[0]
}

/** "오늘 {n}명 참여" 같은 문구의 {자리}를 실제 값으로 채웁니다. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in values ? String(values[key]) : `{${key}}`,
  )
}
