import { motion } from 'framer-motion'
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
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center bg-gradient-to-b from-[#1a2440] to-[#0e1633] px-6 text-white">
      {/* 잠금화면 시계 */}
      <div className="mb-10 text-center">
        <p className="font-display text-[3.4rem] leading-none font-bold tabular-nums">{clock(now)}</p>
        <p className="mt-2 text-[1.05rem] text-white/60">{day(now)}</p>
      </div>

      <motion.button
        type="button"
        data-role="open-channel"
        onClick={onOpen}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.98 }}
        className="w-full max-w-[30rem] rounded-2xl bg-white/95 px-5 py-4 text-left text-[#1f2430] shadow-[0_0.6rem_1.8rem_rgba(0,0,0,0.35)] active:bg-white"
      >
        <div className="mb-1.5 flex items-center gap-2">
          <span className="flex h-[1.5rem] w-[1.5rem] items-center justify-center rounded-md bg-[#3478f6] text-white" aria-hidden="true">
            {sms ? (
              <svg width="62%" height="62%" viewBox="0 0 24 24" fill="#fff"><path d="M4 4h16v12H7l-3 3z" /></svg>
            ) : (
              <svg width="62%" height="62%" viewBox="0 0 24 24" fill="#fff"><path d="M4 4h16v11H9l-4 4z" /></svg>
            )}
          </span>
          <span className="text-[0.85rem] font-bold text-[#3478f6]">{c.arrive.title}</span>
          <span className="ml-auto text-[0.8rem] text-[#9aa1ad]">{c.arrive.now}</span>
        </div>
        <p className="text-[1.05rem] font-bold">{who}</p>
        <p className="mt-0.5 line-clamp-2 text-[1rem] text-[#3a4250]">{preview}</p>
      </motion.button>

      <p className="mt-6 text-[1rem] text-white/60">{c.arrive.openHint}</p>
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

