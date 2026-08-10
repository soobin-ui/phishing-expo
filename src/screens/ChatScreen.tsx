import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { SafetyGauge, TapButton } from '../components/Buttons'
import type { Scenario } from '../types'

type Bubble = { from: 'them' | 'me'; text: string }

/** [5] 피싱 메시지 도착 — 메신저 UI, 2턴. Phase 4에서 연출을 완성합니다. */
export function ChatScreen({
  scenario,
  safety,
  onChoice,
  onFinish,
}: {
  scenario: Scenario
  safety: number
  onChoice: (delta: number, weights: Record<string, number>) => void
  onFinish: () => void
}) {
  const [turn, setTurn] = useState(0)
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [showChoices, setShowChoices] = useState(false)

  useEffect(() => {
    const current = scenario.turns[turn]
    if (!current) return
    setShowChoices(false)
    const t1 = window.setTimeout(() => {
      setBubbles((prev) => [...prev, { from: 'them', text: current.message }])
    }, 500)
    const t2 = window.setTimeout(() => setShowChoices(true), 1100)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [turn, scenario])

  const pick = (index: number) => {
    const choice = scenario.turns[turn].choices[index]
    setBubbles((prev) => [...prev, { from: 'me', text: choice.text }])
    onChoice(choice.riskDelta, choice.typeWeight)
    setShowChoices(false)
    window.setTimeout(() => {
      if (turn + 1 < scenario.turns.length) setTurn(turn + 1)
      else onFinish()
    }, 700)
  }

  const visible = bubbles.slice(-3)

  return (
    <div className="flex h-full w-full flex-col">
      <div className="px-6 pt-8 pb-4">
        <SafetyGauge value={safety} />
      </div>

      {/* 메신저 헤더 */}
      <div className="flex items-center gap-3 border-y border-white/10 bg-white/[0.04] px-6 py-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-600 text-[18px] font-bold">
          {scenario.sender.name.slice(0, 1)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[20px] font-semibold">{scenario.sender.name}</p>
          <p className="text-[16px] text-white/45">{scenario.sender.number}</p>
        </div>
      </div>

      {/* 대화 */}
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-3 px-5 py-4">
        {visible.map((bubble, i) => (
            <motion.div
              key={`${bubble.from}-${bubble.text.slice(0, 8)}-${i}`}
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25 }}
              className={bubble.from === 'me' ? 'flex justify-end' : 'flex justify-start'}
            >
              <p
                className={`max-w-[85%] px-4 py-3 text-[20px] leading-relaxed whitespace-pre-line ${
                  bubble.from === 'me'
                    ? 'rounded-2xl rounded-br-sm bg-blue-600 text-white'
                    : 'rounded-2xl rounded-bl-sm bg-white/12 text-white'
                }`}
              >
                {bubble.text}
              </p>
            </motion.div>
          ))}
      </div>

      {/* 선택지 */}
      <div className="flex flex-col gap-3 px-5 pb-[max(24px,env(safe-area-inset-bottom))]">
        {showChoices &&
          scenario.turns[turn].choices.map((choice, i) => (
            <motion.div
              key={choice.text}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.2 }}
            >
              <TapButton tone="ghost" onClick={() => pick(i)}>
                {choice.text}
              </TapButton>
            </motion.div>
          ))}
      </div>
    </div>
  )
}
