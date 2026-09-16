import { useEffect, useRef } from 'react'
import type { KeyboardEvent, ReactNode, RefObject } from 'react'
import { motion } from 'framer-motion'
import type { Scenario } from '../types'

/**
 * 받는 화면(메일·문자·메신저·전화)이 공통으로 받는 것.
 *
 * ★ 화면 모양만 다르고, 흐름은 전부 같습니다.
 *   상대 말이 오고 → 관람객이 직접 쳐서 답하고 → 채점은 ChatScreen 이 합니다.
 *   각 화면은 '보여주기'만 합니다. 채점·안전도·타이머를 여기 넣지 마세요.
 *
 * ★ compose 가 없으면 '다시 보기' — 찾기 화면에서 같은 모양으로 다시 띄울 때입니다.
 *   이때 render 가 수상한 곳을 누를 수 있는 조각으로 바꿔 줍니다.
 */
export type Item = {
  from: 'them' | 'me'
  text: string
  at: Date
  /** 상대 메시지가 몇 번째 턴의 본문인지 (첨부파일·링크 카드를 붙일 때 씁니다) */
  turn?: number
}

export interface Compose {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  canType: boolean
  hint: string
  inputRef: RefObject<HTMLInputElement | null>
}

export interface ChannelProps {
  scenario: Scenario
  items: Item[]
  typing: boolean
  /** '읽음'을 붙일 내 말풍선 번호 (-1 이면 없음) */
  readIndex: number
  /** 글자를 그리는 방법 — 체험 중엔 그대로, 찾기 화면에선 수상한 곳을 누를 수 있게 */
  render: (text: string) => ReactNode
  compose?: Compose
  /** 전화 [끊기] */
  onHangUp?: () => void
}

/** 새 말이 오면 맨 아래를 보여줍니다. 다시 보기(찾기)에서는 처음부터 보여줍니다. */
export function useStickBottom(enabled: boolean, deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (enabled && el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return ref
}

/** Enter 로 보내기 — 한글 조합 중에 누른 Enter 는 무시합니다(글자가 반쪽만 가는 것 방지) */
export function sendOnEnter(onSend: () => void) {
  return (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) onSend()
  }
}

/** 입력창 위 안내 한 줄 */
export function Hint({ text, className }: { text: string; className: string }) {
  return (
    <motion.p
      key={text}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`mb-2.5 text-[0.98rem] leading-snug ${className}`}
    >
      {text}
    </motion.p>
  )
}

/** 말풍선이 떠오르는 공통 동작 */
export const pop = {
  initial: { opacity: 0, y: 14, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.26 },
} as const

/** 점 세 개가 차례로 튀는 '입력 중' */
export function Dots({ className }: { className: string }) {
  return (
    <span className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className={`block h-2 w-2 rounded-full ${className}`}
          animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  )
}

/** 오후 2:31 */
export function clock(d: Date): string {
  const h = d.getHours()
  const m = d.getMinutes()
  const half = h < 12 ? '오전' : '오후'
  const hh = h % 12 === 0 ? 12 : h % 12
  return `${half} ${hh}:${String(m).padStart(2, '0')}`
}

/** 9월 30일 (수) */
export function day(d: Date): string {
  const w = '일월화수목금토'[d.getDay()]
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${w})`
}
