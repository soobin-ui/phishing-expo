/**
 * 화면 흐름 — 한 줄기입니다.
 *
 *   [-] intro  역할 소개 — 당신은 피싱 전문 수사관입니다
 *   [0] menu   체험할 주제(사건)를 고른다
 *   [0'] name  이름을 입력한다 — 시나리오 글의 {name} 자리에 들어간다(저장 안 함)
 *   [1] chat   문자가 오고, 직접 답장을 타이핑한다
 *   [2] caught 넘어갔는지 / 안 넘어갔는지
 *   [3] find   ★ 방금 그 문자에서 수상한 곳 3군데를 찾는다
 *   [4] action 지금 해야 할 것 (112 / 1332 / 118)
 *
 * ★ find 를 chat 앞으로 옮기거나 따로 떼어내지 마세요.
 *   직접 당해본 직후여야 찾을 마음이 생깁니다. 그게 이 순서의 이유입니다.
 */
export type Step =
  | 'intro' // 첫 화면 — 역할 소개
  | 'menu'
  | 'name' // 이름 입력 — 사건 브리핑 전
  | 'arrive' // 도착 화면(받은편지함·알림·울리는 전화) — 관람객이 직접 엶
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
  /** 수사 모드(연구실 메일)에서 찾은 뒤 뜨는 '어떻게 조사할까요?' 말풍선 */
  probe?: {
    question: string
    options: Array<{ label: string; ok: boolean; why: string }>
  }
}

/**
 * 받는 화면 — 주제마다 다릅니다.
 *   mail 업무 이메일 · sms 휴대폰 문자 · messenger 메신저 · call 전화
 */
export type Channel = 'mail' | 'sms' | 'messenger' | 'call'

export interface ScenarioTurn {
  message: string
  /** 문자 첨부파일 카드 (sms) */
  attachment?: { name: string; meta: string }
  /** 링크 미리보기 카드 (sms) */
  preview?: { site: string; title: string; domain: string }
  /** 입력창 위에 뜨는 안내 — 관람객이 직접 답장을 타이핑합니다 */
  hint: string
  /** 내가 쓴 답의 성격에 따라 상대가 바로 받아치는 한 줄 */
  react?: Record<string, string>
  /** 이 턴에서 넘겨준 것. 거절하지 않았으면 마지막에 목록으로 보여줍니다 */
  gave?: string
}

/** 메일 한 통의 모양 — 피싱 메일과 평범한 메일이 같은 틀을 씁니다. */
export interface MailDoc {
  id?: string
  time?: string
  sender: { name: string; address?: string }
  subject?: string
  body?: string
  link?: { label: string; url: string }
  attachment?: { name: string; meta: string }
  /** 링크·첨부 아래에 오는 맺음말(본문과 같은 글자) — "본 조치는 … 드림" */
  closing?: string
  /** 맨 아래 회색 안내 블록 — 발신전용 안내·주소·저작권 */
  signature?: string
}

/**
 * 잠금화면 알림 한 줄 — 피싱 문자 위·아래에 같이 놓는 평범한 알림 (arrive).
 * ★ "체험존이니까 이건 피싱이겠지"를 깨는 장치 — 여기엔 수상한 구석이 없어야 합니다.
 *   from·text 의 {name} 은 입력한 이름, {given} 은 성을 뺀 이름(전수빈 → 수빈)으로 바뀝니다.
 */
export interface LockNotice {
  /** 어느 앱의 알림인지 — 아이콘·앱 이름 */
  app: 'sms' | 'messenger'
  from: string
  text: string
  /** 알림에 붙는 시각 — "20분 전" */
  ago: string
}

export interface Scenario {
  id: string
  situation: string
  channel: Channel
  /** 메일 제목 (mail) */
  subject?: string
  sender: {
    name: string
    number: string
    /** 보낸 사람 주소 (mail) */
    address?: string
    /** 맨 위 경고 한 줄 (messenger) */
    notice?: string
  }
  /**
   * 메일 전용 — 대화가 아니라 '한 통을 통째로 읽고 무엇을 할지 고르는' 방식입니다.
   * (문자·메신저·전화는 turns 로 주고받습니다)
   */
  body?: string
  /** 본문 속 파란 링크 버튼 (mail) */
  link?: { label: string; url: string }
  /** 첨부파일 카드 (mail) */
  attachment?: { name: string; meta: string }
  /** 링크·첨부 아래 맺음말 (mail) */
  closing?: string
  /** 맨 아래 회색 안내 블록 (mail) */
  signature?: string
  /** 메일 도착 시각 표시 (mail) */
  time?: string
  /**
   * 받은편지함에 같이 놓을 평범한 업무 메일 (mail).
   * ★ "체험존이니까 이건 피싱이겠지"를 깨는 장치 — 여기엔 수상한 구석이 없어야 합니다.
   */
  inbox?: MailDoc[]
  /**
   * 잠금화면에 피싱 문자와 함께 놓을 평범한 알림 (sms·messenger).
   * 피싱 문자가 맨 위에 새로 튀어나오고, 이 알림들은 그 아래 이미 와 있던 것처럼 놓입니다.
   */
  lockscreen?: LockNotice[]
  /** 도착 화면 앞에 먼저 뜨는 사건 브리핑(있으면). title·steps 의 {name} 은 입력한 이름, **굵게**는 금색 */
  brief?: { title: string; steps: string[] }
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
