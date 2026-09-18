import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { SafetyGauge } from '../components/Buttons'
import { ChannelView } from '../channels'
import type { Item } from '../channels'
import { fill, situations, ui } from '../lib/content'
import { judgeReply, reply } from '../lib/reply'
import type { Scenario } from '../types'

/**
 * [1] 피싱이 도착 — 관람객이 **직접 답장을 타이핑**합니다.
 *
 * ★ 받는 화면은 주제마다 다릅니다(메일·문자·메신저·전화, src/channels/).
 *   이 파일은 흐름·채점만 맡고, 모양은 ChannelView 가 그립니다.
 *
 * ★ 입력한 글은 이 화면의 메모리에만 있습니다.
 *   저장하지도, 어디로 보내지도 않습니다. 통계에도 점수만 남고 글자는 남지 않습니다.
 *
 * ★ 상대는 API 로 말하지 않습니다.
 *   내가 쓴 답의 성격(safe/risky/digits/neutral)에 따라 미리 써둔 한 줄로 받아칩니다.
 *   문구는 scenarios.json 의 turns[].react, 채점 규칙은 reply.json 에 있습니다.
 *
 * 세로 화면: 안전도 한 줄 → 받는 화면.
 * 가로 화면: 왼쪽 칸(주제·진행·안전도) | 오른쪽 받는 화면.
 */
export function ChatScreen({
  scenario,
  safety,
  onReply,
  onFinish,
  onHangUp,
}: {
  scenario: Scenario
  safety: number
  /** delta: 안전도 증감 · gave: 이 턴에서 넘겨준 것(거절했으면 null) */
  onReply: (delta: number, gave: string | null) => void
  onFinish: () => void
  /** 전화 [끊기] — 그 자리에서 '넘어가지 않음'으로 끝납니다 */
  onHangUp: () => void
}) {
  const [turn, setTurn] = useState(0)
  const [bubbles, setBubbles] = useState<Item[]>([])
  const [canType, setCanType] = useState(false)
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(true)
  const [hit, setHit] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  /** 보낸 뒤 걸어 둔 타이머 — 전화를 끊고 나가면 전부 지웁니다(뒤늦게 다음 화면으로 튀지 않게) */
  const timers = useRef<number[]>([])
  const prevSafety = useRef(safety)

  const situationLabel = situations.find((s) => s.id === scenario.situation)?.label ?? ''

  /* 상대 메시지가 도착합니다 */
  useEffect(() => {
    const current = scenario.turns[turn]
    if (!current) return
    setCanType(false)
    setTyping(true)
    const t1 = window.setTimeout(() => {
      setBubbles((prev) => [...prev, { from: 'them', text: current.message, at: new Date(), turn }])
      setTyping(false)
    }, 900)
    const t2 = window.setTimeout(() => setCanType(true), 1400)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [turn, scenario])

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  /* 입력이 열리면 바로 쓸 수 있게 커서를 둡니다 */
  useEffect(() => {
    if (canType) inputRef.current?.focus()
  }, [canType])

  /* 안전도가 떨어지면 게이지가 한 번 흔들립니다 */
  useEffect(() => {
    if (safety < prevSafety.current) {
      setHit(true)
      const t = window.setTimeout(() => setHit(false), 600)
      prevSafety.current = safety
      return () => window.clearTimeout(t)
    }
    prevSafety.current = safety
  }, [safety])

  const send = () => {
    const value = text.trim()
    if (!canType || value.length === 0) return

    const current = scenario.turns[turn]
    const judged = judgeReply(value)

    // 거절하지 않았으면 이 턴에서 무언가를 넘긴 것입니다
    const gave = judged.kind === 'safe' ? null : (current.gave ?? null)

    setBubbles((prev) => [...prev, { from: 'me', text: value, at: new Date() }])
    onReply(judged.delta, gave)
    setText('')
    setCanType(false)

    // 내가 쓴 답에 상대가 바로 받아칩니다
    const react = current.react?.[judged.kind]
    const last = turn + 1 >= scenario.turns.length

    if (react) {
      later(() => setTyping(true), 550)
      later(() => {
        setBubbles((prev) => [...prev, { from: 'them', text: react, at: new Date() }])
        setTyping(false)
      }, 1250)
    }

    later(
      () => {
        if (!last) setTurn(turn + 1)
        else onFinish()
      },
      react ? 2300 : 1000,
    )
  }

  // 내가 보낸 마지막 말풍선에만 '읽음'을 붙입니다
  const lastMineIndex = bubbles.map((b) => b.from).lastIndexOf('me')
  const answered = lastMineIndex >= 0 && lastMineIndex < bubbles.length - 1
  const total = scenario.turns.length
  const counter = fill(ui.chat.counter, { current: turn + 1, total })

  return (
    <div className="flex h-full w-full flex-col wide:flex-row">
      {/* ── 옆 칸(가로) / 윗줄(세로): 주제 · 진행 · 안전도 ── */}
      <aside className="shrink-0 px-5 pt-[max(0.9rem,2dvh)] pb-3 wide:flex wide:w-[32%] wide:max-w-[26rem] wide:flex-col wide:justify-center wide:gap-10 wide:px-[3%] wide:py-10">
        <div className="mb-2 flex items-center justify-between text-[0.85rem] font-semibold wide:hidden">
          <span className="text-sky">{situationLabel}</span>
          <span className="text-white/40 tabular-nums">{counter}</span>
        </div>
        <div className="hidden wide:block">
          <p className="text-[1rem] font-semibold text-sky">{situationLabel}</p>
          <p className="mt-2 font-display text-[1.9rem] leading-snug font-bold">
            {ui.chat.newMessage}
          </p>
          <TurnDots total={total} current={turn} />
        </div>

        <motion.div
          animate={hit ? { x: [0, -7, 7, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <SafetyGauge value={safety} />
        </motion.div>
      </aside>

      {/* ── 받는 화면 — 체험관 틀 안에 실제 앱처럼 ── */}
      <section className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-t-2xl wide:my-4 wide:mr-4 wide:rounded-2xl">
        <ChannelView
          scenario={scenario}
          items={bubbles}
          typing={typing}
          readIndex={answered ? lastMineIndex : -1}
          render={(t) => t}
          onHangUp={onHangUp}
          compose={{
            value: text,
            onChange: setText,
            onSend: send,
            canType,
            hint: canType ? (scenario.turns[turn]?.hint ?? reply.hint) : ui.chat.waiting,
            inputRef,
          }}
        />
      </section>
    </div>
  )
}

/** 몇 번째 메시지인지 — 가로 화면 옆 칸에만 보입니다 */
function TurnDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="mt-6">
      <div className="flex items-center gap-2">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i < current ? 'w-2 bg-sky/70' : i === current ? 'w-7 bg-gold' : 'w-2 bg-white/20'
            }`}
          />
        ))}
      </div>
      <p className="mt-2.5 text-[0.95rem] font-semibold text-white/40 tabular-nums">
        {fill(ui.chat.counter, { current: current + 1, total })}
      </p>
    </div>
  )
}
