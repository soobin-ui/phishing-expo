import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { TapButton } from '../components/Buttons'
import { splitByFlags } from '../lib/highlight'
import { fill, ui } from '../lib/content'
import type { RedFlag, Scenario } from '../types'

const TIME_LIMIT = 60 // 초 — 대화가 5턴이라 읽을 글이 많습니다

/**
 * [3] 방금 받은 그 문자에서 수상한 곳을 찾습니다. 개수는 시나리오마다 다릅니다.
 *
 * ★ 이 화면은 반드시 '직접 당해본 다음'에 와야 합니다.
 *   처음 보는 문자에서 찾게 하면 그냥 퀴즈지만,
 *   방금 자기가 답장한 문자를 다시 놓고 찾게 하면 남습니다.
 *
 * 세로 화면: 제목 → 문자 → 설명.  가로 화면: 문자 왼쪽 | 제목·설명·버튼 오른쪽.
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

  const heading = (
    <div className="text-center wide:text-left">
      <motion.h2
        key={done ? 'done' : 'ask'}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="font-display text-[min(1.6rem,6.4vw)] leading-snug font-bold whitespace-pre-line text-white wide:text-[1.9rem]"
      >
        {done ? ui.find.timeUp : fill(ui.find.title, { n: total })}
      </motion.h2>
      <p className="mt-2 text-[1.15rem] font-semibold text-gold tabular-nums">
        {fill(ui.find.found, { n: found.length, total })}
        {!done && (
          <span className="ml-3 text-white/40">{fill(ui.find.hintTime, { n: left })}</span>
        )}
      </p>
    </div>
  )

  return (
    <div className="flex h-full w-full flex-col px-5 pt-[max(1.5rem,3vh)] pb-5 wide:flex-row wide:gap-[4%] wide:px-[4%] wide:py-8">
      {/* 세로 화면: 제목이 맨 위 */}
      <div className="shrink-0 wide:hidden">{heading}</div>

      {/* 문자 원본 — 가로 화면에서는 왼쪽 칸 전체 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={miss ? { opacity: 1, y: 0, x: [0, -6, 6, -4, 4, 0] } : { opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="no-scrollbar mt-4 min-h-[30%] flex-1 overflow-auto overscroll-contain rounded-2xl border border-white/15 bg-white/[0.05] p-4 wide:mt-0 wide:min-h-0 wide:min-w-0 wide:p-6"
      >
        <div className="mx-auto max-w-[46rem]">
          <button
            type="button"
            data-role="sender-flag"
            onClick={() => (headerFlag ? tapFlag(headerFlag) : tapMiss())}
            className={`mb-3 block w-full rounded-lg border-b border-white/10 px-1 pb-3 text-left ${
              showAnswer(headerFlag) ? 'bg-red-500/20' : ''
            }`}
          >
            <span className="block text-[1.15rem] font-semibold text-white">
              {scenario.sender.name}
            </span>
            <span
              className={`text-[1.05rem] tabular-nums ${
                showAnswer(headerFlag) ? 'font-bold text-red-300 underline' : 'text-white/45'
              }`}
            >
              {scenario.sender.number}
            </span>
          </button>

          <p className="text-[1.15rem] leading-relaxed whitespace-pre-line text-white/90">
            {segments.map((seg, i) =>
              seg.flag ? (
                <span
                  key={i}
                  onClick={() => tapFlag(seg.flag!)}
                  className={`cursor-pointer rounded px-0.5 py-0.5 ${
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
        </div>
      </motion.div>

      {/* 오른쪽 칸(가로) / 아래(세로): 찾은 것 설명 + 버튼 */}
      <div className="flex max-h-[50%] min-h-0 shrink-0 flex-col wide:max-h-none wide:w-[min(28rem,38%)] wide:justify-center">
        <div className="hidden shrink-0 wide:mb-6 wide:block">{heading}</div>

        {/* 찾은 것부터 하나씩 설명이 붙습니다 */}
        <div className="no-scrollbar flex min-h-0 flex-initial flex-col gap-2 overflow-auto overscroll-contain empty:hidden mt-3 wide:mt-0">
          {scenario.redFlags
            .filter((flag) => showAnswer(flag))
            .map((flag) => (
              <motion.div
                key={flag.target}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="shrink-0 rounded-xl border-l-4 border-gold bg-white/[0.06] px-4 py-2.5"
              >
                <p className="text-[1.1rem] font-bold text-gold">{flag.label}</p>
                <p className="text-[1rem] leading-snug text-white/75">{flag.explain}</p>
              </motion.div>
            ))}
        </div>

        {done && (
          <div className="mt-4 shrink-0">
            <TapButton onClick={() => onDone(found.length)}>{ui.find.next}</TapButton>
          </div>
        )}
      </div>
    </div>
  )
}
