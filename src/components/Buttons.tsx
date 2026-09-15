import type { ReactNode } from 'react'
import { ui } from '../lib/content'

/**
 * primary — 금색 (QR 페이지 [응모하기]와 같은 버튼). 다음으로 넘어가는 주 버튼.
 * ghost   — 어두운 바탕 위의 보조 버튼.
 * light   — 밝은 바탕 위의 보조 버튼.
 */
type Tone = 'primary' | 'ghost' | 'light'

const toneClass: Record<Tone, string> = {
  primary:
    'bg-gold text-navy-deep shadow-[0_0.3rem_0_var(--color-gold-deep)] active:translate-y-[0.2rem] active:shadow-[0_0.1rem_0_var(--color-gold-deep)]',
  ghost: 'bg-white/8 text-white border border-white/25 active:bg-white/15',
  light: 'bg-white text-navy border border-navy/15 active:bg-sky-pale',
}

/** 모든 터치 버튼의 기본 — 손가락이 넉넉히 닿는 높이 */
export function TapButton({
  children,
  onClick,
  tone = 'primary',
  className = '',
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  tone?: Tone
  className?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[4rem] w-full rounded-2xl px-6 py-3 font-display text-[1.3rem] leading-snug font-bold transition-[transform,box-shadow] duration-100 disabled:opacity-40 ${toneClass[tone]} ${className}`}
    >
      {children}
    </button>
  )
}

/** 안전도 게이지 (문자가 오는 동안) — 가로 화면 옆 칸에서는 숫자를 크게 */
export function SafetyGauge({ value }: { value: number }) {
  const color = value >= 70 ? 'bg-emerald-400' : value >= 40 ? 'bg-gold' : 'bg-red-500'
  return (
    <div className="w-full">
      <div className="mb-2 flex items-end justify-between text-[0.95rem] font-semibold text-white/70 wide:text-[1.05rem]">
        <span>{ui.chat.safetyLabel}</span>
        <span className="font-display text-[1.15rem] leading-none font-bold text-white tabular-nums wide:text-[2.6rem]">
          {Math.round(value)}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/12 wide:h-3.5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  )
}

/** 이 체험 전체에서 쓰는 행사 머리표 — QR 페이지와 같은 남색 알약 */
export function EventPill({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block rounded-full bg-navy px-[1.1em] py-[0.5em] font-display leading-none font-bold text-white ${className}`}
    >
      {ui.menu.eyebrow}
    </span>
  )
}
