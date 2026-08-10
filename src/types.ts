/**
 * 화면 흐름
 *
 *   [0] menu ─┬─ [A] 시나리오 체험 : age → chat → caught → redflag → result
 *             └─ [B] 피싱 찾기 퀴즈 : quiz(2문제) → result
 */
export type Step =
  | 'menu' // [0] 첫 화면 — 두 가지 중 고르기
  | 'age' // [A-1] 연령대 고르기
  | 'chat' // [A-2] 피싱 메시지 대화
  | 'caught' // [A-3] 당함 연출
  | 'debrief' // [A-4] 복기 — 방금 받은 문자를 되짚어 보여줌
  | 'quiz' // [B-1] 산학연 피싱 문자에서 3곳 찾기 (2문제)
  | 'result' // 마무리
  | 'admin' // 운영자 화면

/** 어느 쪽을 골랐는지 */
export type Track = 'chat' | 'quiz'

/** 막(幕) — 화면 색감이 이 값에 따라 바뀝니다. */
export type Act = 'bright' | 'dark' | 'counter'

export interface AgeGroup {
  id: string
  label: string
  note: string
}

export interface RedFlag {
  target: string
  match: string
  label: string
  explain: string
}

export interface ScenarioTurn {
  message: string
  /** 입력창 위에 뜨는 안내 — 관람객이 직접 답장을 타이핑합니다 */
  hint: string
}

export interface Scenario {
  id: string
  ageGroup: string
  sender: { name: string; number: string }
  turns: ScenarioTurn[]
  redFlags: RedFlag[]
}

/** 퀴즈 한 문제 — 피싱 문자 한 통과 그 안의 수상한 지점 3곳 */
export interface QuizItem {
  id: string
  topic: string
  sender: { name: string; number: string }
  message: string
  redFlags: RedFlag[]
}

/** 한 명의 체험 기록 — 개인을 알아볼 수 있는 정보는 넣지 않습니다. */
export interface SessionRecord {
  sessionId: string // 무작위 번호
  startedAt: number
  durationMs: number
  completed: boolean
  track: Track
  ageGroup: string // 퀴즈만 한 경우 빈 값
  scenarioId: string
  flagsFound: number
  flagsTotal: number
  defended: boolean
}
