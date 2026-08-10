import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { TapButton } from '../components/Buttons'
import { splitByFlags } from '../lib/highlight'
import { fill, ui } from '../lib/content'
import type { RedFlag, Scenario } from '../types'

const TIME_LIMIT = 60 // 초 — 대화가 5턴이라 읽을 글이 많습니다

/** 글자가 한 줄씩 밀려 올라오는 공통 동작 */
const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: 'easeOut' } },
} as const

/**
 * [3] 방금 받은 그 문자에서 수상한 곳을 찾습니다. 개수는 시나리오마다 다릅니다.
 *
 * ★ 이 화면은 반드시 '직접 당해본 다음'에 와야 합니다.
 *   처음 보는 문자에서 찾게 하면 그냥 퀴즈지만,
 *   방금 자기가 답장한 문자를 다시 놓고 찾게 하면 남습니다.
 *
 * ★ redFlags 에 없는데 수상해 보이는 문장을 메시지에 두지 마세요.
 *   관람객이 그걸 누르면 맞는데도 '틀렸다'고 흔들립니다.
 */
export function FindScreen({
  scenario,
  onDone,
}: {
  scenario: Scenario
  onDone: (foundCount: number) => void
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
  const total = scenario.redFlags.length

  const [found, setFound] = useState<string[]>([])
  const [miss, setMiss] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [left, setLeft] = useState(TIME_LIMIT)

  const done = revealed || found.length >= scenario.redFlags.length

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
  }

  const tapMiss = () => {
    if (done) return
    setMiss(true)
    window.setTimeout(() => setMiss(false), 900)
  }

  const isFound = (flag?: RedFlag) => !!flag && found.includes(flag.target)
  const showAnswer = (flag?: RedFlag) => !!flag && (isFound(flag) || revealed)

  return (
    <div className="flex h-full w-full flex-col px-9 py-12">
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
        className="shrink-0 text-center"
      >
        <motion.h2
          key={done ? 'done' : 'ask'}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-0 text-[36px] leading-snug font-extrabold whitespace-pre-line text-white"
        >
          {done ? ui.find.timeUp : fill(ui.find.title, { n: total })}
        </motion.h2>
        <motion.p variants={rise} className="mt-3 text-[25px] font-semibold text-blue-300 tabular-nums">
          {fill(ui.find.found, { n: found.length, total })}
          {!done && (
            <span className="ml-3 text-white/40">{fill(ui.find.hintTime, { n: left })}</span>
          )}
        </motion.p>
      </motion.div>

      {/* 문자 원본 — 손이 닿는 위치에 둡니다 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={miss ? { opacity: 1, y: 0, x: [0, -6, 6, -4, 4, 0] } : { opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="mt-4 max-h-[52%] shrink-0 overflow-auto border-2 border-white/15 bg-white/[0.05] p-4"
      >
        <button
          type="button"
          onClick={() => (headerFlag ? tapFlag(headerFlag) : tapMiss())}
          className={`mb-3 block w-full border-b border-white/10 pb-3 text-left ${
            showAnswer(headerFlag) ? 'bg-red-500/20' : ''
          }`}
        >
          <span className="block text-[25px] font-semibold text-white">{scenario.sender.name}</span>
          <span
            className={`text-[23px] ${
              showAnswer(headerFlag) ? 'font-bold text-red-300 underline' : 'text-white/45'
            }`}
          >
            {scenario.sender.number}
          </span>
        </button>

        <p className="text-[25px] leading-relaxed whitespace-pre-line text-white/90">
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

      {/* 찾은 것부터 하나씩 설명이 붙습니다 */}
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
              <p className="text-[24px] font-bold text-blue-200">{flag.label}</p>
              <p className="text-[22px] leading-snug text-white/70">{flag.explain}</p>
            </motion.div>
          ))}
      </div>

      {done && (
        <div className="mt-4 shrink-0">
          <TapButton tone="counter" onClick={() => onDone(found.length)}>
            {ui.find.next}
          </TapButton>
        </div>
      )}
    </div>
  )
}
