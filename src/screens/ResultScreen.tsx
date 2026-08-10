import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TapButton } from '../components/Buttons'
import { fill, ui } from '../lib/content'

const AUTO_RESET = 30 // 초

/** 마무리 화면 — 두 갈래가 같은 화면으로 끝납니다. */
export function ResultScreen({
  found,
  total,
  safety,
  onReset,
}: {
  found: number
  total: number
  safety: number
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

  // '무엇을 답했는가'(안전도)와 '몇 개 찾았는가'를 반씩 봅니다.
  const ratio = (safety / 100) * 0.5 + (total > 0 ? found / total : 0) * 0.5
  const grade = ratio >= 0.8 ? r.gradeHigh : ratio >= 0.45 ? r.gradeMid : r.gradeLow
  const score = fill(r.score, { found, total, safety: Math.round(safety) })

  return (
    <div className="flex h-full w-full flex-col px-10 py-14">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="shrink-0 text-center"
      >
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-[26px] text-white/50"
        >
          {r.title}
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.12, ease: 'easeOut' }}
          className="mt-5 text-[46px] leading-snug font-extrabold text-white"
        >
          {grade}
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.24 }}
          className="mt-4 text-[28px] text-blue-300 tabular-nums"
        >
          {score}
        </motion.p>
      </motion.div>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 py-6">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mb-1 text-[26px] font-bold text-white/70"
        >
          {r.rulesTitle}
        </motion.p>
        {r.rules.map((rule, i) => (
          <motion.div
            key={rule}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.42 + i * 0.12 }}
            className="flex items-start gap-3 border-l-4 border-blue-400 bg-blue-400/10 px-4 py-3"
          >
            <span className="text-[28px] font-extrabold text-blue-300 tabular-nums">{i + 1}</span>
            <span className="text-[26px] leading-relaxed text-white/90">{rule}</span>
          </motion.div>
        ))}
      </div>

      <div className="shrink-0">
        <TapButton tone="counter" onClick={onReset}>
          {r.again}
        </TapButton>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          className="mt-3 text-center text-[22px] text-white/35 tabular-nums"
        >
          {fill(r.autoReset, { n: left })}
        </motion.p>
      </div>
    </div>
  )
}
