import type { ReactNode } from 'react'

type Tone = 'primary' | 'choice' | 'danger' | 'ghost' | 'counter'

const toneClass: Record<Tone, string> = {
  primary: 'bg-blue-600 text-white rounded-2xl active:bg-blue-700',
  choice:
    'bg-white text-slate-900 rounded-2xl border-2 border-slate-200 active:bg-slate-100 active:border-blue-400',
  danger: 'bg-red-600 text-white rounded-none active:bg-red-700',
  counter:
    'bg-[#0f1c3a] text-white rounded-none border-2 border-blue-500/60 active:bg-[#16294f]',
  ghost: 'bg-white/10 text-white rounded-none border border-white/20 active:bg-white/20',
}

/** 모든 터치 버튼의 기본 — 높이 72px 이상, 글자 22px 이상 */
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
      className={`min-h-[104px] w-full px-7 py-5 text-[29px] leading-snug font-semibold transition-transform duration-100 active:scale-[0.98] disabled:opacity-40 ${toneClass[tone]} ${className}`}
    >
      {children}
    </button>
  )
}

/** 질문 진행 표시 — 점 7개 */
export function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center justify-center gap-2.5">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-3 rounded-full transition-all duration-300 ${
            i < current ? 'w-3 bg-blue-600' : i === current ? 'w-8 bg-blue-600' : 'w-3 bg-slate-300'
          }`}
        />
      ))}
    </div>
  )
}

/** 안전도 게이지 (2막~3막) */
export function SafetyGauge({ value }: { value: number }) {
  const color = value >= 70 ? 'bg-emerald-400' : value >= 40 ? 'bg-amber-400' : 'bg-red-500'
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-[18px] font-medium text-white/70">
        <span>안전도</span>
        <span className="tabular-nums">{Math.round(value)}</span>
      </div>
      <div className="h-3 w-full overflow-hidden bg-white/15">
        <div
          className={`h-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  )
}
