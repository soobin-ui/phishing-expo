import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { SafetyGauge } from '../components/Buttons'
import { fill, ui } from '../lib/content'
import { judgeReply, reply } from '../lib/reply'
import type { Scenario } from '../types'

type Bubble = { from: 'them' | 'me'; text: string; at: Date }

/**
 * [1] 피싱 문자 도착 — 관람객이 **직접 답장을 타이핑**합니다.
 *
 * ★ 입력한 글은 이 화면의 메모리에만 있습니다.
 *   저장하지도, 어디로 보내지도 않습니다. 통계에도 점수만 남고 글자는 남지 않습니다.
 *
 * ★ 상대는 API 로 말하지 않습니다.
 *   내가 쓴 답의 성격(safe/risky/digits/neutral)에 따라 미리 써둔 한 줄로 받아칩니다.
 *   문구는 scenarios.json 의 turns[].react, 채점 규칙은 reply.json 에 있습니다.
 */
export function ChatScreen({
  scenario,
  safety,
  onReply,
  onFinish,
}: {
  scenario: Scenario
  safety: number
  /** delta: 안전도 증감 · gave: 이 턴에서 넘겨준 것(거절했으면 null) */
  onReply: (delta: number, gave: string | null) => void
  onFinish: () => void
}) {
  const [turn, setTurn] = useState(0)
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [canType, setCanType] = useState(false)
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(true)
  const [hit, setHit] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevSafety = useRef(safety)

  /* 상대 메시지가 도착합니다 */
  useEffect(() => {
    const current = scenario.turns[turn]
    if (!current) return
    setCanType(false)
    setTyping(true)
    const t1 = window.setTimeout(() => {
      setBubbles((prev) => [...prev, { from: 'them', text: current.message, at: new Date() }])
      setTyping(false)
    }, 900)
    const t2 = window.setTimeout(() => setCanType(true), 1400)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [turn, scenario])

  /* 새 말풍선이 생기면 항상 맨 아래를 보여줍니다 */
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [bubbles, typing])

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
      window.setTimeout(() => setTyping(true), 550)
      window.setTimeout(() => {
        setBubbles((prev) => [...prev, { from: 'them', text: react, at: new Date() }])
        setTyping(false)
      }, 1250)
    }

    window.setTimeout(
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

  return (
    <div className="flex h-full w-full flex-col">
      <motion.div
        className="px-9 pt-12 pb-5"
        animate={hit ? { x: [0, -7, 7, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <SafetyGauge value={safety} />
      </motion.div>

      {/* 메신저 헤더 */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-4 border-y border-white/10 bg-white/[0.04] px-9 py-5"
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-600 text-[23px] font-bold">
          {scenario.sender.name.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[26px] font-semibold">{scenario.sender.name}</p>
          <p className="text-[21px] text-white/45">{scenario.sender.number}</p>
        </div>
        <p className="shrink-0 text-[20px] font-semibold text-white/35 tabular-nums">
          {fill(ui.chat.counter, { current: turn + 1, total: scenario.turns.length })}
        </p>
      </motion.div>

      {/* 대화 — 길어지면 위로 밀려 올라가고 항상 아래가 보입니다 */}
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-8 py-6"
      >
        {bubbles.map((bubble, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.28 }}
            className={`flex shrink-0 items-end gap-2.5 ${
              bubble.from === 'me' ? 'justify-end' : 'justify-start'
            }`}
          >
            {bubble.from === 'me' && (
              <span className="shrink-0 pb-1 text-right text-[17px] leading-tight text-white/35">
                {answered && i === lastMineIndex && (
                  <span className="block font-semibold text-blue-300">{ui.chat.read}</span>
                )}
                {clock(bubble.at)}
              </span>
            )}

            <p
              className={`max-w-[76%] px-5 py-4 text-[26px] leading-relaxed whitespace-pre-line ${
                bubble.from === 'me'
                  ? 'rounded-2xl rounded-br-sm bg-blue-600 text-white'
                  : 'rounded-2xl rounded-bl-sm bg-white/12 text-white'
              }`}
            >
              {bubble.text}
            </p>

            {bubble.from === 'them' && (
              <span className="shrink-0 pb-1 text-[17px] text-white/35">{clock(bubble.at)}</span>
            )}
          </motion.div>
        ))}

        {typing && <TypingBubble />}
      </div>

      {/* 직접 답장 쓰기 */}
      <div className="shrink-0 border-t border-white/10 bg-white/[0.03] px-8 pt-5 pb-10">
        <motion.p
          key={`${turn}-${canType}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-4 text-[22px] leading-snug text-blue-300"
        >
          {canType ? (scenario.turns[turn]?.hint ?? reply.hint) : ui.chat.waiting}
        </motion.p>

        <div className="flex items-stretch gap-3">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send()
            }}
            disabled={!canType}
            maxLength={60}
            placeholder={reply.placeholder}
            enterKeyHint="send"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-2xl border-2 border-white/15 bg-white/[0.06] px-6 py-5 text-[26px] text-white placeholder:text-white/30 focus:border-blue-400 focus:outline-none disabled:opacity-40"
          />
          <motion.button
            type="button"
            onClick={send}
            disabled={!canType || text.trim().length === 0}
            whileTap={{ scale: 0.96 }}
            className="shrink-0 rounded-2xl bg-blue-600 px-8 text-[26px] font-bold text-white disabled:opacity-30"
          >
            {reply.send}
          </motion.button>
        </div>
      </div>
    </div>
  )
}

/** 상대가 입력 중일 때 뜨는 말풍선 — 점 세 개가 차례로 튑니다. */
function TypingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex shrink-0 justify-start"
    >
      <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-white/12 px-6 py-5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block h-3 w-3 rounded-full bg-white/60"
            animate={{ y: [0, -7, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  )
}

/** 오후 2:31 */
function clock(d: Date): string {
  const h = d.getHours()
  const m = d.getMinutes()
  const half = h < 12 ? '오전' : '오후'
  const hh = h % 12 === 0 ? 12 : h % 12
  return `${half} ${hh}:${String(m).padStart(2, '0')}`
}
