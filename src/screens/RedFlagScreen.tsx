import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { SafetyGauge, TapButton } from '../components/Buttons'
import { splitByFlags } from '../lib/highlight'
import { fill, ui } from '../lib/content'
import type { RedFlag, Scenario } from '../types'

const TIME_LIMIT = 25 // 초

/** [7] 3막 — 위험 신호 찾기. Phase 5에서 판정 연출을 완성합니다. */
export function RedFlagScreen({
  scenario,
  safety,
  onFound,
  onNext,
}: {
  scenario: Scenario
  safety: number
  onFound: () => void
  onNext: (foundCount: number) => void
}) {
  const messageText = useMemo(
    () => scenario.turns.map((t) => t.message).join('\n\n'),
    [scenario],
  )
  const segments = useMemo(
    () => splitByFlags(messageText, scenario.redFlags),
    [messageText, scenario],
  )
  const headerFlag = scenario.redFlags.find((f) => f.match === scenario.sender.number)

  const [found, setFound] = useState<string[]>([])
  const [miss, setMiss] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [left, setLeft] = useState(TIME_LIMIT)

  const done = revealed || found.length >= 3

  useEffect(() => {
    if (done) return
    const id = window.setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          setRevealed(true)
          return 0
        }
        return v - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [done])

  const tapFlag = (flag: RedFlag) => {
    if (done || found.includes(flag.target)) return
    setFound((prev) => [...prev, flag.target])
    onFound()
  }

  const tapMiss = () => {
    if (done) return
    setMiss(true)
    window.setTimeout(() => setMiss(false), 900)
  }

  const isFound = (flag?: RedFlag) => !!flag && found.includes(flag.target)
  const showAnswer = (flag?: RedFlag) => !!flag && (isFound(flag) || revealed)

  return (
    <div className="flex h-full w-full flex-col px-5 pt-8 pb-[max(24px,env(safe-area-inset-bottom))]">
      <SafetyGauge value={safety} />

      <div className="mt-5 mb-3 text-center">
        <h2 className="text-[27px] leading-snug font-extrabold whitespace-pre-line text-white">
          {done ? ui.redflag.timeUp : ui.redflag.title}
        </h2>
        <p className="mt-2 text-[19px] font-semibold text-blue-300 tabular-nums">
          {fill(ui.redflag.found, { n: found.length })}
          {!done && <span className="ml-3 text-white/40">{left}초</span>}
        </p>
      </div>

      {/* 다시 뜬 메시지 — 손이 닿는 위치에 둡니다 */}
      <motion.div
        animate={miss ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.35 }}
        className="max-h-[48%] shrink-0 overflow-auto border-2 border-white/15 bg-white/[0.05] p-4"
      >
        <button
          type="button"
          onClick={() => (headerFlag ? tapFlag(headerFlag) : tapMiss())}
          className={`mb-3 block w-full border-b border-white/10 pb-3 text-left ${
            showAnswer(headerFlag) ? 'bg-red-500/20' : ''
          }`}
        >
          <span className="block text-[19px] font-semibold text-white">
            {scenario.sender.name}
          </span>
          <span
            className={`text-[18px] ${
              showAnswer(headerFlag) ? 'font-bold text-red-300 underline' : 'text-white/45'
            }`}
          >
            {scenario.sender.number}
          </span>
        </button>

        <p className="text-[19px] leading-relaxed whitespace-pre-line text-white/90">
          {segments.map((seg, i) =>
            seg.flag ? (
              <span
                key={i}
                onClick={() => tapFlag(seg.flag!)}
                className={`cursor-pointer rounded px-1 py-0.5 ${
                  showAnswer(seg.flag)
                    ? 'bg-red-500/30 font-bold text-red-200 underline decoration-red-400 decoration-2'
                    : ''
                }`}
              >
                {seg.text}
              </span>
            ) : (
              <span key={i} onClick={tapMiss}>
                {seg.text}
              </span>
            ),
          )}
        </p>
      </motion.div>

      {/* 정답 설명 */}
      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
        {scenario.redFlags
            .filter((flag) => showAnswer(flag))
            .map((flag) => (
              <motion.div
                key={flag.target}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-l-4 border-blue-400 bg-blue-400/10 px-3 py-2"
              >
                <p className="text-[18px] font-bold text-blue-200">{flag.label}</p>
                <p className="text-[17px] leading-snug text-white/70">{flag.explain}</p>
              </motion.div>
            ))}
      </div>

      {done && (
        <div className="mt-4">
          <TapButton tone="counter" onClick={() => onNext(found.length)}>
            {ui.redflag.next}
          </TapButton>
        </div>
      )}
    </div>
  )
}
