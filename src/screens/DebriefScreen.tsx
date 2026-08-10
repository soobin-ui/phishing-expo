import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { TapButton } from '../components/Buttons'
import { splitByFlags } from '../lib/highlight'
import { ui } from '../lib/content'
import type { Scenario } from '../types'

/**
 * [A-4] 복기 — 방금 겪은 문자를 되짚어 보여줍니다.
 *
 * ★ 여기서 "찾아보세요"를 시키지 마세요.
 *   그러면 [B] 피싱 찾기 퀴즈와 하는 일이 똑같아집니다.
 *   시나리오 쪽은 '직접 겪은 것을 설명해주는' 자리이고,
 *   퀴즈 쪽은 '직접 찾아보는' 자리입니다. 이 구분이 두 갈래의 존재 이유입니다.
 */
export function DebriefScreen({
  scenario,
  defended,
  onNext,
}: {
  scenario: Scenario
  defended: boolean
  onNext: () => void
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

  // 설명이 하나씩 붙고 나서 버튼이 보입니다(다 읽기 전에 넘어가지 않게)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 900 + scenario.redFlags.length * 550)
    return () => window.clearTimeout(t)
  }, [scenario])

  return (
    <div className="flex h-full w-full flex-col px-9 py-12">
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
        className="shrink-0 text-center"
      >
        <motion.h2
          variants={rise}
          className="text-[36px] leading-snug font-extrabold whitespace-pre-line text-white"
        >
          {defended ? ui.debrief.titleSafe : ui.debrief.titleCaught}
        </motion.h2>
        <motion.p variants={rise} className="mt-3 text-[23px] text-white/55">
          {ui.debrief.sub}
        </motion.p>
      </motion.div>

      {/* 방금 받은 문자 — 수상한 곳은 처음부터 표시돼 있습니다 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="mt-6 max-h-[46%] shrink-0 overflow-auto border-2 border-white/15 bg-white/[0.05] p-4"
      >
        <div className="mb-3 border-b border-white/10 pb-3">
          <span className="block text-[25px] font-semibold text-white">{scenario.sender.name}</span>
          <span
            className={`text-[23px] ${
              headerFlag ? 'font-bold text-red-300 underline' : 'text-white/45'
            }`}
          >
            {scenario.sender.number}
          </span>
        </div>

        <p className="text-[25px] leading-relaxed whitespace-pre-line text-white/90">
          {segments.map((seg, i) =>
            seg.flag ? (
              <span
                key={i}
                className="rounded bg-red-500/30 px-1 py-0.5 font-bold text-red-200 underline decoration-red-400 decoration-2"
              >
                {seg.text}
              </span>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </p>
      </motion.div>

      {/* 왜 수상한지 하나씩 */}
      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
        {scenario.redFlags.map((flag, i) => (
          <motion.div
            key={flag.target}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.7 + i * 0.55 }}
            className="border-l-4 border-blue-400 bg-blue-400/10 px-4 py-3"
          >
            <p className="text-[24px] font-bold text-blue-200">{flag.label}</p>
            <p className="mt-1 text-[22px] leading-snug text-white/70">{flag.explain}</p>
          </motion.div>
        ))}
      </div>

      {ready && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mt-5 shrink-0"
        >
          <TapButton tone="counter" onClick={onNext}>
            {ui.debrief.next}
          </TapButton>
        </motion.div>
      )}
    </div>
  )
}

const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: 'easeOut' } },
} as const
