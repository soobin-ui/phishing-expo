import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { TapButton } from '../components/Buttons'
import { ChannelView, isDarkChannel } from '../channels'
import type { Item } from '../channels'
import { splitByFlags } from '../lib/highlight'
import { fill, ui } from '../lib/content'
import type { RedFlag, Scenario } from '../types'

const TIME_LIMIT = 60 // 초 — 대화가 5턴이라 읽을 글이 많습니다

/**
 * [3] 방금 받은 그 화면(메일·문자·메신저·전화)에서 수상한 곳을 찾습니다.
 *     받을 때와 똑같은 모양으로 다시 띄우고, 보낸 사람 줄·첨부파일까지 누를 수 있습니다.
 *
 * ★ 이 화면은 반드시 '직접 당해본 다음'에 와야 합니다.
 *   처음 보는 문자에서 찾게 하면 그냥 퀴즈지만,
 *   방금 자기가 답장한 문자를 다시 놓고 찾게 하면 남습니다.
 *
 * 세로 화면: 제목 → 받은 화면 → 설명.  가로 화면: 받은 화면 왼쪽 | 제목·설명·버튼 오른쪽.
 *
 * ★ redFlags 에 없는데 수상해 보이는 문장을 메시지에 두지 마세요.
 *   관람객이 그걸 누르면 맞는데도 '틀렸다'고 흔들립니다.
 */
export function FindScreen({
  scenario,
  defended,
  onDone,
}: {
  scenario: Scenario
  /** 안 넘어간 사람인지 — 제목이 '왜 수상했는지 짚어볼까요?'로 바뀝니다 */
  defended: boolean
  onDone: (foundCount: number) => void
}) {
  // 방금 받은 그 화면 그대로 — 상대가 보낸 본문만 다시 띄웁니다(내 답장·받아친 말은 빼고)
  const items = useMemo<Item[]>(() => {
    const at = new Date()
    return scenario.turns.map((t, turn) => ({ from: 'them' as const, text: t.message, at, turn }))
  }, [scenario])
  const total = scenario.redFlags.length
  const dark = isDarkChannel(scenario.channel)

  const [found, setFound] = useState<string[]>([])
  const [miss, setMiss] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [left, setLeft] = useState(TIME_LIMIT)

  const allFound = found.length >= total
  const done = revealed || allFound

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
    if (done) return
    // 같은 곳을 여러 번(또는 같은 주소가 여러 줄에) 눌러도 한 번만 셉니다
    setFound((prev) => (prev.includes(flag.target) ? prev : [...prev, flag.target]))
  }

  const tapMiss = () => {
    if (done) return
    setMiss(true)
    window.setTimeout(() => setMiss(false), 900)
  }

  const showAnswer = (flag: RedFlag) => found.includes(flag.target) || revealed

  /** 화면의 글자를 '누를 수 있는 조각'으로 — 수상한 곳이면 찾음, 아니면 흔들림 */
  const render = (text: string) =>
    splitByFlags(text, scenario.redFlags).map((seg, i) =>
      seg.flag ? (
        <span
          key={i}
          onClick={() => tapFlag(seg.flag!)}
          // 찾기 전에는 여백 없음 — 틈이 생기면 수상한 자리가 새어 나갑니다
          className={`cursor-pointer rounded ${
            showAnswer(seg.flag) ? `px-0.5 ${dark ? FOUND_DARK : FOUND_LIGHT}` : ''
          }`}
        >
          {seg.text}
        </span>
      ) : (
        <span key={i} onClick={tapMiss}>
          {seg.text}
        </span>
      ),
    )

  const medium = ui.find.medium[scenario.channel]
  const heading = (
    <div className="text-center wide:text-left">
      <motion.h2
        key={done ? 'done' : 'ask'}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="font-display text-[min(1.6rem,6.4vw)] leading-snug font-bold whitespace-pre-line text-white wide:text-[1.9rem]"
      >
        {allFound
          ? ui.find.allFound
          : done
            ? ui.find.timeUp
            : fill(defended ? ui.find.titleSafe : ui.find.title, { n: total, medium })}
      </motion.h2>
      <p className="mt-2 flex items-center justify-center gap-4 wide:justify-start">
        <span className="text-[1.15rem] font-semibold text-gold tabular-nums">
          {fill(ui.find.found, { n: found.length, total })}
        </span>
        {/* 남은 시간 — 작게 두면 아무도 못 봅니다. 크게, 10초 남으면 붉게 */}
        {!done && (
          <span
            className={`font-display text-[1.7rem] leading-none font-bold tabular-nums ${
              left <= 10 ? 'text-[#ff8080]' : 'text-white/85'
            }`}
          >
            {fill(ui.find.hintTime, { n: left })}
          </span>
        )}
      </p>
    </div>
  )

  return (
    <div className="flex h-full w-full flex-col px-4 pt-[max(1.25rem,2.5vh)] pb-4 wide:flex-row wide:gap-[3%] wide:px-[3%] wide:py-6">
      {/* 세로 화면: 제목이 맨 위 */}
      <div className="shrink-0 wide:hidden">{heading}</div>

      {/* 방금 받은 그 화면 — 가로 화면에서는 왼쪽 칸 전체 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={miss ? { opacity: 1, y: 0, x: [0, -6, 6, -4, 4, 0] } : { opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="mt-3.5 min-h-[30%] flex-1 overflow-hidden rounded-2xl wide:mt-0 wide:min-h-0 wide:min-w-0"
      >
        <ChannelView scenario={scenario} items={items} typing={false} readIndex={-1} render={render} />
      </motion.div>

      {/* 오른쪽 칸(가로) / 아래(세로): 찾은 것 설명 + 버튼 */}
      <div className="flex max-h-[50%] min-h-0 shrink-0 flex-col wide:max-h-none wide:w-[min(28rem,36%)] wide:justify-center">
        <div className="hidden shrink-0 wide:mb-6 wide:block">{heading}</div>

        {/* 찾은 것부터 하나씩 설명이 붙습니다 */}
        <div className="no-scrollbar mt-3 flex min-h-0 flex-initial flex-col gap-2 overflow-auto overscroll-contain empty:hidden wide:mt-0">
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

const FOUND_LIGHT = 'bg-red-100 font-bold text-red-700 underline decoration-red-400 decoration-2'
const FOUND_DARK = 'bg-red-500/30 font-bold text-red-200 underline decoration-red-400 decoration-2'
