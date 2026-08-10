import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { TapButton } from '../components/Buttons'
import { splitByFlags } from '../lib/highlight'
import { fill, ui } from '../lib/content'
import type { QuizItem, RedFlag } from '../types'

const TIME_LIMIT = 40 // 초

/** 글자가 한 줄씩 밀려 올라오는 공통 동작 */
const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: 'easeOut' } },
} as const

/**
 * [B] 피싱 찾기 퀴즈 — 산학연협력 현장을 노린 문자에서 수상한 곳 3군데를 찾습니다.
 *
 * ★ 메시지 안에 수상한 지점이 정확히 3개만 있어야 합니다.
 *   4개째를 넣으면 관람객이 맞는 곳을 눌러도 '틀렸다'고 흔들립니다.
 */
export function QuizFindScreen({
  quiz,
  index,
  total,
  onDone,
}: {
  quiz: QuizItem
  index: number
  total: number
  onDone: (foundCount: number) => void
}) {
  const segments = useMemo(() => splitByFlags(quiz.message, quiz.redFlags), [quiz])
  const headerFlag = quiz.redFlags.find((f) => f.match === quiz.sender.number)

  const [found, setFound] = useState<string[]>([])
  const [miss, setMiss] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [left, setLeft] = useState(TIME_LIMIT)

  const done = revealed || found.length >= quiz.redFlags.length

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
        key={quiz.id}
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
        className="shrink-0 text-center"
      >
        <motion.p variants={rise} className="text-[23px] font-bold text-blue-300">
          {fill(ui.quiz.counter, { current: index + 1, total })}
        </motion.p>
        <motion.h2
          key={done ? 'done' : 'ask'}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-3 text-[36px] leading-snug font-extrabold whitespace-pre-line text-white"
        >
          {done ? ui.quiz.timeUp : ui.quiz.title}
        </motion.h2>
        <motion.p variants={rise} className="mt-3 text-[25px] font-semibold text-blue-300 tabular-nums">
          {fill(ui.quiz.found, { n: found.length })}
          {!done && (
            <span className="ml-3 text-white/40">{fill(ui.quiz.hintTime, { n: left })}</span>
          )}
        </motion.p>
      </motion.div>

      {/* 문자 원본 — 손이 닿는 위치에 둡니다 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={miss ? { opacity: 1, y: 0, x: [0, -6, 6, -4, 4, 0] } : { opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="mt-4 max-h-[48%] shrink-0 overflow-auto border-2 border-white/15 bg-white/[0.05] p-4"
      >
        <button
          type="button"
          onClick={() => (headerFlag ? tapFlag(headerFlag) : tapMiss())}
          className={`mb-3 block w-full border-b border-white/10 pb-3 text-left ${
            showAnswer(headerFlag) ? 'bg-red-500/20' : ''
          }`}
        >
          <span className="block text-[25px] font-semibold text-white">{quiz.sender.name}</span>
          <span
            className={`text-[23px] ${
              showAnswer(headerFlag) ? 'font-bold text-red-300 underline' : 'text-white/45'
            }`}
          >
            {quiz.sender.number}
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
        {quiz.redFlags
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
            {index + 1 < total ? ui.quiz.next : ui.quiz.last}
          </TapButton>
        </div>
      )}
    </div>
  )
}
