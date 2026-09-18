/** 수사관 톤 공용 조각 — 첫 화면(IntroScreen)과 사건 고르기(MenuScreen)가 같이 씁니다 */

/** 어두운 사이버 바탕 — 카드 화면(검거 완료)과 같은 격자 + 푸른 빛 */
export function CyberBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(70%_45%_at_50%_28%,rgba(47,168,255,0.28),transparent_72%)] wide:bg-[radial-gradient(45%_60%_at_30%_50%,rgba(47,168,255,0.28),transparent_72%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(47,168,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(47,168,255,0.08)_1px,transparent_1px)] bg-[size:2.2rem_2.2rem] opacity-70" />
    </div>
  )
}

/** 아래쪽 수사 테이프 — 글자가 천천히 흘러갑니다 */
export function CautionTape({ text }: { text: string }) {
  const chunk = `${text}  ·  `
  return (
    <div
      className="pointer-events-none absolute inset-x-[-4%] bottom-[clamp(0.6rem,2vh,1.2rem)] z-20 flex h-[clamp(2.2rem,5vh,2.9rem)] -rotate-[1.5deg] items-center overflow-hidden bg-gold shadow-[0_0.3rem_1.2rem_rgba(0,0,0,0.45)]"
      aria-hidden="true"
    >
      <div className="absolute inset-x-0 top-0 h-[0.28rem] bg-[repeating-linear-gradient(-45deg,#0e1633_0_0.5rem,transparent_0.5rem_1rem)]" />
      <div className="absolute inset-x-0 bottom-0 h-[0.28rem] bg-[repeating-linear-gradient(-45deg,#0e1633_0_0.5rem,transparent_0.5rem_1rem)]" />
      <div className="tape-marquee flex shrink-0 whitespace-nowrap font-display text-[clamp(0.85rem,2vh,1.05rem)] font-bold tracking-[0.12em] text-navy-deep">
        <span>{chunk.repeat(8)}</span>
        <span>{chunk.repeat(8)}</span>
      </div>
    </div>
  )
}

export function BadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.05em] w-[1.05em]" aria-hidden="true">
      <path d="M12 2l8 3v6c0 5-3.4 9.3-8 11-4.6-1.7-8-6-8-11V5z" fill="currentColor" opacity="0.25" />
      <path d="M12 2l8 3v6c0 5-3.4 9.3-8 11-4.6-1.7-8-6-8-11V5z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.2l1.4 2.9 3.1.4-2.3 2.2.6 3.1-2.8-1.5-2.8 1.5.6-3.1-2.3-2.2 3.1-.4z" fill="currentColor" />
    </svg>
  )
}

export function Magnifier({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L21 21" strokeLinecap="round" />
    </svg>
  )
}

export function MailIcon({ className = 'h-[55%] w-[55%]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3.5 7l8.5 6 8.5-6" strokeLinejoin="round" />
    </svg>
  )
}

export function SmsIcon({ className = 'h-[55%] w-[55%]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M4 5h16a1 1 0 011 1v10a1 1 0 01-1 1H10l-5 4v-4H4a1 1 0 01-1-1V6a1 1 0 011-1z" strokeLinejoin="round" />
      <path d="M7.5 9.5h9M7.5 12.5h6" strokeLinecap="round" />
    </svg>
  )
}

export function PhoneIcon({ className = 'h-[55%] w-[55%]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M6.6 3.2c.5-.3 1.1-.2 1.5.3l2.2 3c.3.5.3 1.1-.1 1.5l-1.3 1.3c.9 2 2.5 3.6 4.5 4.5l1.3-1.3c.4-.4 1-.5 1.5-.1l3 2.2c.5.4.6 1 .3 1.5l-1.1 1.9c-.4.7-1.2 1.1-2 1C9.8 18.3 5.7 14.2 5 7.6c-.1-.8.3-1.6 1-2z" />
    </svg>
  )
}

export function ChatIcon({ className = 'h-[55%] w-[55%]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M12 4c5 0 9 3.1 9 7s-4 7-9 7c-.9 0-1.8-.1-2.6-.3L5 19.5l1.2-3.6C4.2 14.6 3 12.9 3 11c0-3.9 4-7 9-7z" strokeLinejoin="round" />
      <circle cx="8.5" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="11" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** 가짜 사이트(4번) — 지구본 */
function WebIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" />
    </svg>
  )
}

/** 사건 종류(채널)별 아이콘 */
export function ChannelIcon({ channel, className }: { channel: string; className?: string }) {
  if (channel === 'mail') return <MailIcon className={className} />
  if (channel === 'call') return <PhoneIcon className={className} />
  if (channel === 'messenger') return <ChatIcon className={className} />
  if (channel === 'web') return <WebIcon className={className} />
  return <SmsIcon className={className} />
}
