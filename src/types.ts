/**
 * 화면 흐름 — 한 줄기입니다.
 *
 *   [0] menu   받아볼 문자를 고른다
 *   [1] chat   문자가 오고, 직접 답장을 타이핑한다
 *   [2] caught 넘어갔는지 / 안 넘어갔는지
 *   [3] find   ★ 방금 그 문자에서 수상한 곳 3군데를 찾는다
 *   [4] action 지금 해야 할 것 (112 / 1332 / 118)
 *
 * ★ find 를 chat 앞으로 옮기거나 따로 떼어내지 마세요.
 *   직접 당해본 직후여야 찾을 마음이 생깁니다. 그게 이 순서의 이유입니다.
 */
export type Step =
  | 'menu'
  | 'chat'
  | 'caught'
  | 'find'
  | 'action'
  | 'admin' // 운영자 화면

/** 첫 화면에서 고르는 상황 */
export interface Situation {
  id: string
  label: string
  desc: string
}

/** 막(幕) — 화면 색감이 이 값에 따라 바뀝니다. */
export type Act = 'bright' | 'dark' | 'counter'

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
  /** 내가 쓴 답의 성격에 따라 상대가 바로 받아치는 한 줄 */
  react?: Record<string, string>
  /** 이 턴에서 넘겨준 것. 거절하지 않았으면 마지막에 목록으로 보여줍니다 */
  gave?: string
}

export interface Scenario {
  id: string
  situation: string
  sender: { name: string; number: string }
  turns: ScenarioTurn[]
  redFlags: RedFlag[]
}

/** 한 명의 체험 기록 — 개인을 알아볼 수 있는 정보는 넣지 않습니다. */
export interface SessionRecord {
  sessionId: string // 무작위 번호
  startedAt: number
  durationMs: number
  completed: boolean
  situation: string
  scenarioId: string
  flagsFound: number
  flagsTotal: number
  defended: boolean
}
