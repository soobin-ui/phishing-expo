import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TapButton } from '../components/Buttons'
import { fill, ui } from '../lib/content'
import type { Track } from '../types'

const AUTO_RESET = 30 // 초

/** 마무리 화면 — 두 갈래가 같은 화면으로 끝납니다. */
export function ResultScreen({
  track,
  found,
  total,
  onReset,
}: {
  track: Track
  found: number
  total: number
  onReset: () => void
}) {
  const r = ui.result
  const [left, setLeft] = useState(AUTO_RESET)

  useEffect(() => {
    const id = window.setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          onReset()
          return 0
        }
        return v - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ratio = total > 0 ? found / total : 0
  const grade = ratio >= 0.8 ? r.gradeHigh : ratio >= 0.4 ? r.gradeMid : r.gradeLow
  const score = fill(track === 'chat' ? r.scoreChat : r.scoreQuiz, { found, total })

  return (
    <div className="flex h-full w-full flex-col px-6 pt-[max(36px,env(safe-area-inset-top))] pb-[max(28px,env(safe-area-inset-bottom))]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="shrink-0 text-center"
      >
        <p className="text-[20px] text-white/50">{r.title}</p>
        <p className="mt-4 text-[34px] leading-snug font-extrabold text-white">{grade}</p>
        <p className="mt-3 text-[22px] text-blue-300 tabular-nums">{score}</p>
      </motion.div>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 py-6">
        <p className="mb-1 text-[20px] font-bold text-white/70">{r.rulesTitle}</p>
        {r.rules.map((rule, i) => (
          <motion.div
            key={rule}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.15 + i * 0.12 }}
            className="flex items-start gap-3 border-l-4 border-blue-400 bg-blue-400/10 px-4 py-3"
          >
            <span className="text-[22px] font-extrabold text-blue-300 tabular-nums">{i + 1}</span>
            <span className="text-[20px] leading-relaxed text-white/90">{rule}</span>
          </motion.div>
        ))}
      </div>

      <div className="shrink-0">
        <TapButton tone="counter" onClick={onReset}>
          {r.again}
        </TapButton>
        <p className="mt-3 text-center text-[17px] text-white/35 tabular-nums">
          {fill(r.autoReset, { n: left })}
        </p>
      </div>
    </div>
  )
}
