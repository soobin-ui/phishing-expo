import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { SafetyGauge } from '../components/Buttons'
import { judgeReply, reply } from '../lib/reply'
import type { Scenario } from '../types'

type Bubble = { from: 'them' | 'me'; text: string }

/**
 * [A-2] 피싱 문자 도착 — 관람객이 **직접 답장을 타이핑**합니다.
 *
 * ★ 입력한 글은 이 화면의 메모리에만 있습니다.
 *   저장하지도, 어디로 보내지도 않습니다. 통계에도 점수만 남고 글자는 남지 않습니다.
 *   채점 규칙은 src/content/reply.json 에서 고칠 수 있습니다.
 */
export function ChatScreen({
  scenario,
  safety,
  onReply,
  onFinish,
}: {
  scenario: Scenario
  safety: number
  onReply: (delta: number) => void
  onFinish: () => void
}) {
  const [turn, setTurn] = useState(0)
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [canType, setCanType] = useState(false)
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const current = scenario.turns[turn]
    if (!current) return
    setCanType(false)
    setTyping(true)
    const t1 = window.setTimeout(() => {
      setBubbles((prev) => [...prev, { from: 'them', text: current.message }])
      setTyping(false)
    }, 900)
    const t2 = window.setTimeout(() => setCanType(true), 1400)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [turn, scenario])

  const send = () => {
    const value = text.trim()
    if (!canType || value.length === 0) return

    setBubbles((prev) => [...prev, { from: 'me', text: value }])
    onReply(judgeReply(value).delta)
    setText('')
    setCanType(false)

    window.setTimeout(() => {
      if (turn + 1 < scenario.turns.length) setTurn(turn + 1)
      else onFinish()
    }, 800)
  }

  const visible = bubbles.slice(-4)

  return (
    <div className="flex h-full w-full flex-col">
      <div className="px-9 pt-12 pb-5">
        <SafetyGauge value={safety} />
      </div>

      {/* 메신저 헤더 */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3 border-y border-white/10 bg-white/[0.04] px-9 py-5"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-600 text-[23px] font-bold">
          {scenario.sender.name.slice(0, 1)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[26px] font-semibold">{scenario.sender.name}</p>
          <p className="text-[21px] text-white/45">{scenario.sender.number}</p>
        </div>
      </motion.div>

      {/* 대화 */}
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-4 px-8 py-6">
        {visible.map((bubble, i) => (
          <motion.div
            key={`${bubble.from}-${bubble.text.slice(0, 8)}-${i}`}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.28 }}
            className={bubble.from === 'me' ? 'flex justify-end' : 'flex justify-start'}
          >
            <p
              className={`max-w-[85%] px-5 py-4 text-[26px] leading-relaxed whitespace-pre-line ${
                bubble.from === 'me'
                  ? 'rounded-2xl rounded-br-sm bg-blue-600 text-white'
                  : 'rounded-2xl rounded-bl-sm bg-white/12 text-white'
              }`}
            >
              {bubble.text}
            </p>
          </motion.div>
        ))}

        {typing && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[21px] text-white/40"
          >
            {reply.typing}
          </motion.p>
        )}
      </div>

      {/* 직접 답장 쓰기 */}
      <div className="shrink-0 border-t border-white/10 bg-white/[0.03] px-8 pt-5 pb-10">
        <motion.p
          key={turn}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: canType ? 1 : 0.35, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-4 text-[22px] leading-snug text-blue-300"
        >
          {scenario.turns[turn]?.hint ?? reply.hint}
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
