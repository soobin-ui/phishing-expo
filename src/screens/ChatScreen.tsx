import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { SafetyGauge } from '../components/Buttons'
import { fill, situations, ui } from '../lib/content'
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
 *
 * 세로 화면: 안전도 한 줄 → 대화창.
 * 가로 화면: 왼쪽 칸(상황·진행·안전도) | 오른쪽 대화창.
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

  const situationLabel = situations.find((s) => s.id === scenario.situation)?.label ?? ''

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
  const total = scenario.turns.length

  return (
    <div className="flex h-full w-full flex-col wide:flex-row">
      {/* ── 옆 칸(가로) / 윗줄(세로): 상황 · 진행 · 안전도 ── */}
      <aside className="shrink-0 px-5 pt-[max(1.25rem,2.5vh)] pb-4 wide:flex wide:w-[34%] wide:max-w-[28rem] wide:flex-col wide:justify-center wide:gap-10 wide:border-r wide:border-white/10 wide:bg-white/[0.02] wide:px-[3%] wide:py-10">
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

      {/* ── 대화창 ── */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* 메신저 머리 */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex shrink-0 items-center gap-3.5 border-y border-white/10 bg-white/[0.04] px-5 py-3.5 wide:border-t-0 wide:px-7 wide:py-5"
        >
          <div className="flex h-[2.8rem] w-[2.8rem] shrink-0 items-center justify-center rounded-full bg-navy font-display text-[1.1rem] font-bold text-sky">
            {scenario.sender.name.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[1.2rem] font-semibold">{scenario.sender.name}</p>
            <p className="text-[0.95rem] text-white/45 tabular-nums">{scenario.sender.number}</p>
          </div>
          <p className="shrink-0 text-[0.95rem] font-semibold text-white/35 tabular-nums wide:hidden">
            {fill(ui.chat.counter, { current: turn + 1, total })}
          </p>
        </motion.div>

        {/* 대화 — 길어지면 위로 밀려 올라가고 항상 아래가 보입니다 */}
        <div
          ref={scrollRef}
          className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <div className="mx-auto flex w-full max-w-[52rem] flex-col gap-3.5 px-4 py-5 wide:px-7">
            {bubbles.map((bubble, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.28 }}
                className={`flex shrink-0 items-end gap-2 ${
                  bubble.from === 'me' ? 'justify-end' : 'justify-start'
                }`}
              >
                {bubble.from === 'me' && (
                  <span className="shrink-0 pb-1 text-right text-[0.78rem] leading-tight text-white/35">
                    {answered && i === lastMineIndex && (
                      <span className="block font-semibold text-gold">{ui.chat.read}</span>
                    )}
                    {clock(bubble.at)}
                  </span>
                )}

                <p
                  className={`max-w-[78%] px-4 py-3 text-[1.2rem] leading-relaxed whitespace-pre-line ${
                    bubble.from === 'me'
                      ? 'rounded-2xl rounded-br-md bg-gold font-medium text-navy-deep'
                      : 'rounded-2xl rounded-bl-md bg-white/10 text-white'
                  }`}
                >
                  {bubble.text}
                </p>

                {bubble.from === 'them' && (
                  <span className="shrink-0 pb-1 text-[0.78rem] text-white/35">
                    {clock(bubble.at)}
                  </span>
                )}
              </motion.div>
            ))}

            {typing && <TypingBubble />}
          </div>
        </div>

        {/* 직접 답장 쓰기 */}
        <div className="shrink-0 border-t border-white/10 bg-white/[0.03] px-4 pt-3.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] wide:px-7 wide:pb-7">
          <div className="mx-auto w-full max-w-[52rem]">
            <motion.p
              key={`${turn}-${canType}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="mb-3 text-[1.05rem] leading-snug text-sky"
            >
              {canType ? (scenario.turns[turn]?.hint ?? reply.hint) : ui.chat.waiting}
            </motion.p>

            <div className="flex items-stretch gap-2.5">
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
                className="min-w-0 flex-1 rounded-2xl border border-white/20 bg-white/[0.07] px-4 py-3.5 text-[1.2rem] text-white placeholder:text-white/30 focus:border-gold focus:outline-none disabled:opacity-40"
              />
              <motion.button
                type="button"
                onClick={send}
                disabled={!canType || text.trim().length === 0}
                whileTap={{ scale: 0.96 }}
                className="shrink-0 rounded-2xl bg-gold px-5 font-display text-[1.15rem] font-bold text-navy-deep disabled:opacity-30 wide:px-7"
              >
                {reply.send}
              </motion.button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

/** 몇 번째 문자인지 — 가로 화면 옆 칸에만 보입니다 */
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

/** 상대가 입력 중일 때 뜨는 말풍선 — 점 세 개가 차례로 튑니다. */
function TypingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex shrink-0 justify-start"
    >
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-white/10 px-5 py-4">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block h-2.5 w-2.5 rounded-full bg-white/60"
            animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
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
