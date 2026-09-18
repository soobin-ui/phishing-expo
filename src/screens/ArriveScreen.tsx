import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { clock, day } from '../channels/shared'
import { ui } from '../lib/content'
import type { Scenario } from '../types'

/**
 * [0.5] 도착 화면 — 무엇이 왔는지 보여주고, 관람객이 **직접 열게** 합니다.
 *
 * ★ 문자·메신저는 잠금화면 알림, 전화는 울리는 화면입니다.
 *   (메일은 받은편지함이 곧 체험의 시작이라 MailScreen 이 직접 그립니다)
 *
 * ★ 전화만 예외 — 울리는 화면에서 [받기]/[거절]입니다.
 *   [거절]을 누르면 그 자리에서 '넘어가지 않음'으로 끝납니다(모르는 번호는 안 받아도 된다).
 *
 * 자동으로 열리지 않습니다(사용자 결정). 60초 무입력 자동 리셋은 App 이 겁니다.
 */
export function ArriveScreen({
  scenario,
  onOpen,
  onDecline,
}: {
  scenario: Scenario
  onOpen: () => void
  /** 전화 [거절] */
  onDecline: () => void
}) {
  // 미리보기 첫 줄 — 메일은 본문에서, 나머지는 첫 메시지에서
  const preview = (scenario.body ?? scenario.turns[0]?.message ?? '').split('\n')[0]
  if (scenario.channel === 'call') {
    return <CallRinging scenario={scenario} onOpen={onOpen} onDecline={onDecline} />
  }
  return <PushNotice scenario={scenario} preview={preview} onOpen={onOpen} />
}

/* ── 문자·메신저: 잠금화면 알림 배너 ── */
/**
 * scenario.lockscreen 이 있으면 평범한 알림(자녀 문자 등)이 먼저 와 있고,
 * 잠시 뒤 피싱 문자가 맨 위로 **튀어나와 반짝입니다**(팝업 + 은은한 점멸 ≈ 1.5초 주기).
 * ★ 점멸은 광과민성 기준(초당 3회 미만)을 넘기지 않습니다. 더 빠르게 하지 마세요.
 * ★ 평범한 알림은 눌러도 아무 일도 없습니다 — 열 수 있는 건 새로 온 문자 하나뿐입니다.
 */
function PushNotice({
  scenario,
  preview,
  onOpen,
}: {
  scenario: Scenario
  preview: string
  onOpen: () => void
}) {
  const sms = scenario.channel === 'sms'
  const c = sms ? ui.channels.sms : ui.channels.messenger
  const who = sms ? scenario.sender.number : scenario.sender.name
  const now = new Date()
  const others = scenario.lockscreen ?? []

  /** 사건 브리핑(시나리오에 있으면) — 잠금화면을 흐리게 깔고 먼저 뜹니다. 닫아야 피싱 문자가 옵니다 */
  const [brief, setBrief] = useState(!!scenario.brief)

  // 평범한 알림이 먼저 자리를 잡고, 피싱 문자는 브리핑을 닫자마자(0.35초) '띠링' 하고 도착합니다
  // ★ 더 늘리지 마세요 — 1.4초였을 때 "대기 시간이 길다"는 피드백이 있었습니다(2026-09-18)
  const [arrived, setArrived] = useState(others.length === 0 && !scenario.brief)
  useEffect(() => {
    if (arrived || brief) return
    const id = window.setTimeout(() => setArrived(true), 350)
    return () => window.clearTimeout(id)
  }, [arrived, brief])

  return (
    <div className="relative h-full w-full">
    <AnimatePresence>
      {brief && scenario.brief && <Brief brief={scenario.brief} onStart={() => setBrief(false)} />}
    </AnimatePresence>
    <div
      aria-hidden={brief}
      className={`flex h-full min-h-0 flex-col items-center justify-center bg-gradient-to-b from-[#1a2440] to-[#0e1633] px-6 text-white transition-[filter] duration-500 ${
        brief ? 'pointer-events-none blur-[6px] select-none' : ''
      }`}
    >
      {/* 잠금화면 시계 */}
      <div className="mb-10 text-center">
        <p className="font-display text-[3.4rem] leading-none font-bold tabular-nums">{clock(now)}</p>
        <p className="mt-2 text-[1.05rem] text-white/60">{day(now)}</p>
      </div>

      <div className="flex w-full max-w-[30rem] flex-col gap-2.5">
        {/* 새로 온 피싱 문자 — 위에서 튀어나온 뒤 계속 반짝입니다 */}
        {arrived && (
          <motion.div
            layout
            initial={{ opacity: 0, y: -34, scale: 0.82 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            className="relative"
          >
            <motion.button
              type="button"
              data-role="open-channel"
              onClick={onOpen}
              animate={{
                scale: [1, 1.025, 1],
                boxShadow: [
                  '0 0.6rem 1.8rem rgba(0,0,0,0.35), 0 0 0 0 rgba(140,200,255,0)',
                  '0 0.6rem 1.8rem rgba(0,0,0,0.35), 0 0 1.4rem 0.22rem rgba(140,200,255,0.9)',
                  '0 0.6rem 1.8rem rgba(0,0,0,0.35), 0 0 0 0 rgba(140,200,255,0)',
                ],
              }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
              whileTap={{ scale: 0.98 }}
              className="w-full rounded-2xl bg-white px-5 py-4 text-left text-[#1f2430] active:bg-white"
            >
              <NoticeHead sms={sms} app={c.arrive.title} when={c.arrive.now} highlight />
              <p className="text-[1.05rem] font-bold">{who}</p>
              <p className="mt-0.5 line-clamp-2 text-[1rem] text-[#3a4250]">{preview}</p>
            </motion.button>
            {/* 안 읽음 점 — 천천히 깜빡입니다 */}
            <motion.span
              aria-hidden="true"
              animate={{ opacity: [1, 0.25, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
              className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-[#ff3b30] shadow-[0_0_0.6rem_rgba(255,59,48,0.9)]"
            />
          </motion.div>
        )}

        {/* 이미 와 있던 평범한 알림 — 자녀 문자 등. 수상한 구석이 없어야 합니다 */}
        {others.map((n, i) => (
          <motion.div
            layout
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.12 * i }}
            className="w-full rounded-2xl bg-white/85 px-5 py-4 text-left text-[#1f2430] shadow-[0_0.4rem_1.2rem_rgba(0,0,0,0.25)]"
          >
            <NoticeHead sms={n.app === 'sms'} app={n.app === 'sms' ? ui.channels.sms.kind : ui.channels.messenger.arrive.title} when={n.ago} />
            <p className="text-[1.05rem] font-bold">{n.from}</p>
            <p className="mt-0.5 line-clamp-2 text-[1rem] text-[#3a4250]">{n.text}</p>
          </motion.div>
        ))}
      </div>

      <p className="mt-6 text-[1rem] text-white/60">{c.arrive.openHint}</p>
    </div>
    </div>
  )
}

/**
 * 사건 브리핑 — 1·2번 주제(메일·포렌식)와 같은 상자. 무엇이 오는지·무엇을 할지 먼저 알고 시작하게.
 * 문구는 scenarios.json 의 brief(title·steps, {name} 치환됨). **굵게** 부분은 금색.
 */
function Brief({ brief, onStart }: { brief: { title: string; steps: string[]; note?: string }; onStart: () => void }) {
  const b = ui.brief
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-[#050a18]/55 px-5"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        className="w-full max-w-[30rem] rounded-2xl border border-[#2fa8ff]/60 bg-[#0b1631]/95 px-[clamp(1.2rem,4vw,1.8rem)] py-[clamp(1.2rem,3vh,1.8rem)] text-center text-white shadow-[0_0_2.4rem_rgba(47,168,255,0.35),inset_0_0_1.6rem_rgba(47,168,255,0.08)]"
      >
        <span className="inline-flex items-center gap-1.5 rounded-md bg-gold px-2.5 py-1 font-display text-[0.85rem] leading-none font-bold text-navy-deep">
          <svg viewBox="0 0 24 24" className="h-[0.95rem] w-[0.95rem]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M4 4h16v12H7l-3 3z" strokeLinejoin="round" />
          </svg>
          {b.tag}
        </span>
        <h2 className="mt-3 font-display text-[min(1.6rem,6vw)] leading-snug font-bold whitespace-pre-line [text-shadow:0_0_1rem_rgba(47,168,255,0.6)]">
          {brief.title}
        </h2>
        <ol className="mt-5 flex flex-col gap-2.5 text-left">
          {brief.steps.map((step, i) => (
            <li key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-3">
              <span className="flex h-[2.3rem] w-[2.3rem] shrink-0 items-center justify-center rounded-lg border border-[#2fa8ff]/50 bg-[#050a18] font-display text-[1.05rem] font-bold text-[#9fe0ff]">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 text-[1.08rem] leading-snug whitespace-pre-line text-white/85">
                {step.split('**').map((part, k) =>
                  k % 2 ? (
                    <b key={k} className="font-bold whitespace-nowrap text-gold">{part}</b>
                  ) : (
                    <span key={k}>{part}</span>
                  ),
                )}
              </span>
            </li>
          ))}
        </ol>
        {brief.note && <p className="mt-3 text-[0.9rem] leading-snug text-white/55">{brief.note}</p>}
        <button
          type="button"
          data-role="brief-start"
          onClick={onStart}
          className="mt-5 min-h-[3.8rem] w-full rounded-xl bg-gold px-4 font-display text-[1.25rem] font-bold text-navy-deep shadow-[0_0.3rem_0_var(--color-gold-deep)] active:translate-y-[0.15rem] active:shadow-[0_0.15rem_0_var(--color-gold-deep)]"
        >
          {b.start}
        </button>
      </motion.div>
    </motion.div>
  )
}

/** 알림 카드 윗줄 — 앱 아이콘 · 앱 이름 · 시각 */
function NoticeHead({ sms, app, when, highlight }: { sms: boolean; app: string; when: string; highlight?: boolean }) {
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <span className="flex h-[1.5rem] w-[1.5rem] items-center justify-center rounded-md bg-[#3478f6] text-white" aria-hidden="true">
        {sms ? (
          <svg width="62%" height="62%" viewBox="0 0 24 24" fill="#fff"><path d="M4 4h16v12H7l-3 3z" /></svg>
        ) : (
          <svg width="62%" height="62%" viewBox="0 0 24 24" fill="#fff"><path d="M4 4h16v11H9l-4 4z" /></svg>
        )}
      </span>
      <span className={`text-[0.85rem] font-bold ${highlight ? 'text-[#3478f6]' : 'text-[#6b7280]'}`}>{app}</span>
      <span className="ml-auto text-[0.8rem] text-[#9aa1ad]">{when}</span>
    </div>
  )
}

/* ── 전화: 울리는 화면 (받기 / 거절) ── */
function CallRinging({
  scenario,
  onOpen,
  onDecline,
}: {
  scenario: Scenario
  onOpen: () => void
  onDecline: () => void
}) {
  const c = ui.channels.call
  return (
    <div className="flex h-full min-h-0 flex-col items-center bg-[radial-gradient(120%_70%_at_50%_0%,#33405e_0%,#151b2b_70%)] px-6 text-white">
      <div className="mt-[max(3rem,10vh)] text-center">
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="text-[1.05rem] text-white/70"
        >
          {c.arrive.ringing}
        </motion.p>
        <p className="mt-4 text-[2.2rem] leading-tight font-bold tracking-wide tabular-nums">
          {scenario.sender.number}
        </p>
        <p className="mt-2 text-[1rem] text-[#aab3c5]">{scenario.sender.name}</p>
      </div>

      <p className="mt-6 max-w-[22rem] text-center text-[0.98rem] leading-snug text-sky">
        {c.arrive.declineHint}
      </p>

      <div className="mt-auto flex w-full max-w-[24rem] items-end justify-between pb-[max(2.5rem,8vh)]">
        <CallAction
          label={c.arrive.decline}
          role="decline"
          onClick={onDecline}
          bg="bg-[#ef4444] active:bg-[#dc2626]"
          rotate
        />
        <CallAction
          label={c.arrive.accept}
          role="open-channel"
          onClick={onOpen}
          bg="bg-[#22c55e] active:bg-[#16a34a]"
        />
      </div>
    </div>
  )
}

function CallAction({
  label,
  role,
  onClick,
  bg,
  rotate,
}: {
  label: string
  role: string
  onClick: () => void
  bg: string
  rotate?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <motion.button
        type="button"
        data-role={role}
        onClick={onClick}
        whileTap={{ scale: 0.92 }}
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 1.1, repeat: Infinity }}
        aria-label={label}
        className={`flex h-[4.2rem] w-[4.2rem] items-center justify-center rounded-full ${bg}`}
      >
        <svg width="46%" height="46%" viewBox="0 0 24 24" fill="#fff" aria-hidden="true" className={rotate ? 'rotate-[135deg]' : ''}>
          <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1z" />
        </svg>
      </motion.button>
      <span className="text-[0.95rem] font-semibold text-white/85">{label}</span>
    </div>
  )
}

