import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fill, ui } from '../lib/content'
import { Dots, Hint, sendOnEnter, useStickBottom } from './shared'
import type { ChannelProps } from './shared'

/**
 * 전화(보이스피싱) — 기관·금융.
 *
 * 상대 말은 자막으로 흘러나오고(지난 말은 흐리게), 관람객은 '내 대답'을 쳐서 [말하기].
 * 소리는 내지 않습니다 — 전시장이 시끄럽고 기기마다 목소리가 달라서 자막만으로 완결합니다.
 *
 * ★ 빨간 [끊기]를 누르면 그 자리에서 체험이 끝나고 '넘어가지 않았습니다'로 갑니다.
 *   "모르는 번호가 겁을 주면 끊어도 된다"가 이 주제의 핵심이라,
 *   끊는 행동 자체를 정답으로 만들었습니다. (App.tsx 의 hungUp)
 */
export function CallView({ scenario, items, typing, render, compose, onHangUp }: ChannelProps) {
  const c = ui.channels.call
  const live = !!compose
  const ref = useStickBottom(live, [items.length, typing])
  const lastThem = items.map((it) => it.from).lastIndexOf('them')

  return (
    <div className="flex h-full min-h-0 flex-col items-center bg-[radial-gradient(120%_70%_at_50%_0%,#33405e_0%,#151b2b_70%)] text-white">
      {/* 발신 정보 */}
      <div className="shrink-0 px-4 pt-[max(1rem,2.5dvh)] pb-2 text-center">
        <p className="flex items-center justify-center gap-1.5 text-[0.85rem] font-semibold text-[#8fd19e]">
          {live && <span className="h-1.5 w-1.5 rounded-full bg-[#8fd19e]" />}
          {live ? c.status : c.record}
        </p>
        <p className="mt-1.5 text-[1.9rem] leading-tight font-bold tracking-wide tabular-nums">
          {render(scenario.sender.number)}
        </p>
        <p className="mt-1 text-[0.85rem] text-[#aab3c5]">{fill(c.claimed, { name: scenario.sender.name })}</p>
        {live && <Timer />}
      </div>

      {/* 자막 */}
      <div ref={ref} data-scroll="thread" className="no-scrollbar min-h-0 w-full flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex min-h-full w-full max-w-[40rem] flex-col justify-end gap-3 px-5 py-3">
          {items.map((it, i) => {
            const now = live && i === lastThem && !typing
            const old = live && !now
            return it.from === 'them' ? (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: old ? 0.4 : 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                <p className="mb-0.5 text-[0.72rem] font-bold tracking-wide text-[#9fb0cc]">{c.them}</p>
                <p
                  className={`leading-normal whitespace-pre-line ${
                    now ? 'text-[1.3rem] font-bold' : 'text-[1.02rem]'
                  }`}
                >
                  {render(it.text)}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: old ? 0.55 : 1, y: 0 }}
                className="self-end text-right"
              >
                <p className="mb-0.5 text-[0.72rem] font-bold tracking-wide text-gold/70">{c.me}</p>
                <p className="text-[1rem] leading-normal text-gold">{it.text}</p>
              </motion.div>
            )
          })}

          {typing && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-[0.85rem] text-[#9fb0cc]"
            >
              {c.them} · {c.speaking} <Dots className="bg-[#9fb0cc]" />
            </motion.p>
          )}
        </div>
      </div>

      {compose && (
        <>
          <div className="w-full max-w-[40rem] shrink-0 px-4 pt-2">
            <Hint text={compose.hint} className="text-sky" />
            <div className="flex items-stretch gap-2">
              <input
                ref={compose.inputRef}
                value={compose.value}
                onChange={(e) => compose.onChange(e.target.value)}
                onKeyDown={sendOnEnter(compose.onSend)}
                disabled={!compose.canType}
                maxLength={60}
                placeholder={c.placeholder}
                enterKeyHint="send"
                autoComplete="off"
                className="min-w-0 flex-1 rounded-full bg-white/10 px-4 py-2.5 text-[1.05rem] text-white placeholder:text-white/40 focus:outline-2 focus:outline-gold disabled:opacity-45"
              />
              <button
                type="button"
                onClick={compose.onSend}
                disabled={!compose.canType || compose.value.trim().length === 0}
                className="shrink-0 rounded-full bg-gold px-5 font-display text-[1rem] font-bold text-navy-deep active:bg-gold-deep disabled:opacity-35"
              >
                {c.send}
              </button>
            </div>
          </div>

          {/* 통화 버튼 — 음소거·키패드·스피커는 모양만, 빨간 [끊기]만 동작합니다 */}
          <div className="flex shrink-0 items-end justify-center gap-[clamp(1rem,5vw,2rem)] pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Deco label={c.mute} d="M9 3h6v11H9zM5 11a7 7 0 0014 0M12 18v3" />
            <Deco label={c.keypad} dots />
            <div className="flex flex-col items-center gap-1">
              <motion.button
                type="button"
                onClick={onHangUp}
                whileTap={{ scale: 0.92 }}
                aria-label={c.hangUp}
                data-role="hang-up"
                className="flex h-[3.7rem] w-[3.7rem] items-center justify-center rounded-full bg-[#ef4444] shadow-[0_0_0_0.4rem_rgba(239,68,68,0.18)] active:bg-[#dc2626]"
              >
                <svg width="48%" height="48%" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                  <path d="M12 9c-3.2 0-6.1.9-8.4 2.5-.6.4-.8 1.2-.4 1.8l1.4 2.2c.4.6 1.1.8 1.7.5l2.6-1.2c.5-.2.8-.8.7-1.3l-.3-1.8c1.8-.6 3.7-.6 5.4 0l-.3 1.8c-.1.5.2 1.1.7 1.3l2.6 1.2c.6.3 1.3.1 1.7-.5l1.4-2.2c.4-.6.2-1.4-.4-1.8C18.1 9.9 15.2 9 12 9z" />
                </svg>
              </motion.button>
              <span className="text-[0.72rem] font-semibold text-[#fca5a5]">{c.hangUp}</span>
            </div>
            <Deco label={c.speaker} d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 010 6" />
          </div>
        </>
      )}
    </div>
  )
}

/** 통화 시간 — 계속 올라갑니다 */
function Timer() {
  const [sec, setSec] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setSec((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [])
  const mm = String(Math.floor(sec / 60)).padStart(2, '0')
  const ss = String(sec % 60).padStart(2, '0')
  return <p className="mt-1.5 font-display text-[1rem] text-[#cfd6e4] tabular-nums">{`${mm}:${ss}`}</p>
}

/** 누르는 버튼이 아니라 모양만 있는 통화 버튼 */
function Deco({ label, d, dots }: { label: string; d?: string; dots?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 text-[0.72rem] text-[#aab3c5]" aria-hidden="true">
      <span className="flex h-[2.7rem] w-[2.7rem] items-center justify-center rounded-full bg-white/12">
        <svg width="44%" height="44%" viewBox="0 0 24 24" fill={dots ? '#fff' : 'none'} stroke={dots ? 'none' : '#fff'} strokeWidth="1.8">
          {dots
            ? [6, 12, 18].flatMap((y) => [6, 12, 18].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.8" />))
            : <path d={d} />}
        </svg>
      </span>
      {label}
    </div>
  )
}
