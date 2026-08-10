import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TapButton } from '../components/Buttons'
import { fill, ui } from '../lib/content'

const AUTO_RESET = 40 // 초

/**
 * [4] 마지막 화면 — 실제로 당했을 때 무엇을 해야 하는지.
 *
 * ★ 전화번호를 함부로 바꾸지 마세요. 공개 전시물에 틀린 번호를 띄우면 안 됩니다.
 *   112  경찰청 — 지급정지·신고
 *   1332 금융감독원 — 피해 상담·환급
 *   118  한국인터넷진흥원 — 피싱사이트·스미싱 신고
 */
export function ActionScreen({
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
  const a = ui.action
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
  const grade = ratio >= 0.8 ? a.gradeHigh : ratio >= 0.45 ? a.gradeMid : a.gradeLow

  return (
    <div className="flex h-full w-full flex-col px-10 py-12">
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
        className="shrink-0 text-center"
      >
        <motion.p variants={rise} className="text-[23px] text-white/45">
          {a.eyebrow}
        </motion.p>
        <motion.p variants={rise} className="mt-2 text-[38px] font-extrabold text-white">
          {grade}
        </motion.p>
        <motion.p variants={rise} className="mt-2 text-[24px] text-blue-300 tabular-nums">
          {fill(a.score, { found, total, safety: Math.round(safety) })}
        </motion.p>

        <motion.h2
          variants={rise}
          className="mt-8 text-[40px] leading-snug font-extrabold whitespace-pre-line text-white"
        >
          {a.title}
        </motion.h2>
      </motion.div>

      <div className="mt-7 flex min-h-0 flex-1 flex-col justify-center gap-3">
        {a.steps.map((step, i) => (
          <motion.div
            key={step.n}
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.42, delay: 0.5 + i * 0.14 }}
            className="flex items-start gap-5 border-l-4 border-blue-400 bg-blue-400/10 px-6 py-4"
          >
            <span className="text-[32px] font-extrabold text-blue-300 tabular-nums">{step.n}</span>
            <div className="min-w-0">
              <p className="text-[26px] leading-snug font-bold text-white">{step.title}</p>
              <p className="mt-1 text-[21px] leading-snug text-white/65">{step.desc}</p>
            </div>
          </motion.div>
        ))}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 1.15 }}
          className="mt-2 border border-white/20 px-5 py-4 text-[21px] leading-snug text-white/70"
        >
          {a.app}
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 1.3 }}
        className="shrink-0"
      >
        <TapButton tone="counter" onClick={onReset}>
          {a.again}
        </TapButton>
        <p className="mt-3 text-center text-[20px] text-white/35 tabular-nums">
          {fill(a.autoReset, { n: left })}
        </p>
      </motion.div>
    </div>
  )
}

const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
} as const
