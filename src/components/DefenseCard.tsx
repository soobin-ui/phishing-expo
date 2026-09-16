import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import mascot from '../assets/mascot.webp'
import { fill, ui } from '../lib/content'
import type { RedFlag } from '../types'

/**
 * 검거 완료 — 홍보 포스터 모양의 '피싱 방어력 카드'가 돌면서 나옵니다.
 *
 * ★ 한 화면에 다 들어와야 합니다(스크롤 금지).
 *   제목 / 카드 / 버튼 세 칸으로 나누고, 카드는 남는 높이에 맞춰 크기가 정해집니다
 *   (h-full + aspect-ratio). 그래서 폰이든 태블릿이든 한눈에 보입니다.
 *
 * ★ 카드는 앞면·뒷면이 있습니다.
 *   앞: 캐릭터 + 등급 + 방어력 별점 (포스터와 같은 얼굴)
 *   뒤: 이 메일이 쓴 수법을 한 장씩 (1/4 → 4/4)
 *   뒤집기는 Y축 회전이고, 도는 동안 반대 면 글자가 비치지 않게 backface 를 숨깁니다.
 *
 * 별점은 실제 조사 기록에서 나옵니다 — 찍어서 별 다섯 개가 나오지 않게.
 */
export interface Stats {
  found: number
  total: number
  /** 조사 방법을 틀리게 고른 횟수 */
  wrongs: number
  /** 수상하지 않은 곳을 누른 횟수 */
  misses: number
  /** 링크·첨부 두 곳 중 잡은 개수 */
  blocked: number
}

const clamp = (n: number) => Math.max(1, Math.min(5, n))

export function DefenseCard({
  stats,
  flags,
  solved,
  onNext,
}: {
  stats: Stats
  flags: RedFlag[]
  solved: string[]
  onNext: () => void
}) {
  const t = ui.investigate
  const all = stats.found >= stats.total
  const [shown, setShown] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [trick, setTrick] = useState(0)

  useEffect(() => {
    const id = window.setTimeout(() => setShown(true), 700)
    return () => window.clearTimeout(id)
  }, [])

  const rows = [
    { label: t.card.detect, sub: 'DETECTION', n: clamp(Math.round((stats.found / stats.total) * 5)) },
    { label: t.card.react, sub: 'REACTION', n: clamp(5 - stats.wrongs) },
    { label: t.card.protect, sub: 'PROTECTION', n: clamp(5 - stats.misses) },
    { label: t.card.block, sub: 'ANTI VIRUS', n: clamp(1 + stats.blocked * 2) },
  ]
  const score = rows.reduce((sum, r) => sum + r.n, 0)
  const rank = score >= 18 ? t.card.rankHigh : score >= 13 ? t.card.rankMid : t.card.rankLow
  const flag = flags[trick]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-50 flex flex-col overflow-hidden bg-[#050a18]"
    >
      {/* 사이버 배경 */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(65%_45%_at_50%_30%,rgba(47,168,255,0.3),transparent_72%)]" />
        <div className="absolute inset-0 opacity-60 bg-[linear-gradient(rgba(47,168,255,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(47,168,255,0.09)_1px,transparent_1px)] bg-[size:2.2rem_2.2rem]" />
      </div>

      {/* ① 검거 완료 */}
      <div className="relative z-10 shrink-0 px-5 pt-[max(0.8rem,2.5vh)] text-center">
        <motion.p
          initial={{ scale: 1.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          className="font-display text-[clamp(1.8rem,7vw,2.6rem)] leading-none font-bold text-white [text-shadow:0_0_1.4rem_rgba(47,168,255,0.95),0_0_0.4rem_rgba(255,255,255,0.7)]"
        >
          {all ? t.caughtTitle : t.failTitle}
        </motion.p>
        <p className="mt-1.5 text-[0.92rem] text-sky/75">
          {all ? fill(t.caughtBody, { n: stats.total }) : t.failBody}
        </p>
      </div>

      {/* ② 카드 — 남는 높이에 맞춰 크기가 정해집니다 */}
      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-4 py-3 [perspective:1400px]">
        {shown && (
          <motion.div
            initial={{ rotateY: 900, scale: 0.35, opacity: 0 }}
            animate={{ rotateY: flipped ? 180 : 0, scale: 1, opacity: 1 }}
            transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1] }}
            data-role="defense-card"
            className="relative h-full w-auto max-w-full [transform-style:preserve-3d]"
            style={{ aspectRatio: '5 / 7' }}
          >
            {/* ── 앞면 ── */}
            <CardFace>
              <div className="flex h-full flex-col">
                {/* 윗줄 — UR / CYBER SAFETY ZONE / 방패 */}
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-[1.5em] leading-none font-bold text-white [text-shadow:0_0_0.5em_rgba(47,168,255,0.9)]">
                    UR
                  </span>
                  <span className="flex-1 rounded-full bg-[#1a3f6b] px-1.5 py-[0.28em] text-center font-display text-[0.62em] leading-none font-bold tracking-[0.12em] text-[#7fd4ff]">
                    {t.card.zone}
                  </span>
                  <Shield />
                </div>

                {/* 캐릭터 */}
                <div className="relative flex min-h-0 flex-1 items-center justify-center py-[0.4em]">
                  <div className="absolute h-[68%] w-[68%] rounded-full bg-[radial-gradient(circle,rgba(47,168,255,0.42),transparent_68%)]" />
                  <motion.img
                    src={mascot}
                    alt=""
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative h-full w-auto object-contain drop-shadow-[0_0_0.7em_rgba(47,168,255,0.85)]"
                  />
                </div>

                {/* 등급 */}
                <p className="text-center font-display text-[1.32em] leading-tight font-bold text-white [text-shadow:0_0_0.45em_rgba(47,168,255,0.95)]">
                  {rank}
                </p>

                {/* 방어력 — 포스터 아래 띠처럼 */}
                <div className="mt-[0.5em] grid grid-cols-2 gap-[0.3em]">
                  {rows.map((r, i) => (
                    <motion.div
                      key={r.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.15 + i * 0.12 }}
                      className="rounded-[0.4em] border border-[#2fa8ff]/30 bg-[#0b1631] px-[0.5em] py-[0.35em]"
                    >
                      <p className="text-[0.64em] leading-tight font-bold text-white">{r.label}</p>
                      <div className="mt-[0.25em] flex gap-[0.08em]">
                        {[0, 1, 2, 3, 4].map((k) => (
                          <motion.span
                            key={k}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 1.3 + i * 0.12 + k * 0.06 }}
                          >
                            <Star on={k < r.n} />
                          </motion.span>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <p className="mt-[0.45em] text-center font-display text-[0.55em] tracking-wider text-[#5b7aa8]">
                  {t.card.footer}
                </p>
              </div>
            </CardFace>

            {/* ── 뒷면 — 수법 한 장씩 ── */}
            <CardFace back>
              <div className="flex h-full flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="flex-1 font-display text-[0.8em] font-bold text-[#7fd4ff]">
                    {t.card.tricks}
                  </span>
                  <span className="font-display text-[0.75em] font-bold text-white tabular-nums">
                    {trick + 1} / {flags.length}
                  </span>
                </div>

                <div className="flex min-h-0 flex-1 flex-col justify-center">
                  <span className="flex h-[2.2em] w-[2.2em] items-center justify-center rounded-full bg-[#2fa8ff] font-display text-[1em] font-bold text-[#050a18]">
                    {trick + 1}
                  </span>
                  <p className="mt-[0.6em] text-[1em] leading-snug font-bold text-white">
                    {flag?.label}
                  </p>
                  <p className="mt-[0.45em] text-[0.78em] leading-relaxed text-[#b9cbe6]">
                    {flag?.explain}
                  </p>
                  {!solved.includes(flag?.target ?? '') && (
                    <p className="mt-[0.5em] text-[0.68em] font-bold text-[#ffb4b4]">{t.card.missed}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex flex-1 gap-[0.3em]">
                    {flags.map((f, i) => (
                      <span
                        key={f.target}
                        className={`h-[0.4em] flex-1 rounded-full ${
                          i === trick ? 'bg-[#2fa8ff]' : 'bg-white/20'
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    data-role="next-trick"
                    onClick={() => setTrick((v) => (v + 1) % flags.length)}
                    className="rounded-full bg-[#2fa8ff] px-[0.9em] py-[0.35em] font-display text-[0.7em] font-bold text-[#050a18] active:bg-[#1d8ede]"
                  >
                    {t.card.nextTrick}
                  </button>
                </div>
              </div>
            </CardFace>
          </motion.div>
        )}
      </div>

      {/* ③ 버튼 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: shown ? 1 : 0, y: shown ? 0 : 10 }}
        transition={{ delay: 1.5 }}
        className="relative z-10 shrink-0 px-5 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto flex w-full max-w-[26rem] flex-col gap-2">
          <button
            type="button"
            data-role="flip-card"
            onClick={() => setFlipped((v) => !v)}
            className="w-full rounded-xl border border-[#2fa8ff]/60 bg-[#0c1530] px-4 py-3 text-[1rem] font-bold text-[#7fd4ff] active:bg-[#122246]"
          >
            {flipped ? t.card.flipFront : t.card.flipBack}
          </button>
          <button
            type="button"
            onClick={onNext}
            className="w-full rounded-xl bg-gold px-4 py-3.5 font-display text-[1.15rem] font-bold text-navy-deep shadow-[0_0.3rem_0_var(--color-gold-deep)] active:translate-y-[0.15rem] active:shadow-[0_0.15rem_0_var(--color-gold-deep)]"
          >
            {t.cardNext}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/** 카드 한 면 — 네온 이중 테두리. 글자 크기는 카드 크기를 따라갑니다(em). */
function CardFace({ children, back = false }: { children: ReactNode; back?: boolean }) {
  return (
    <div
      className="absolute inset-0 [backface-visibility:hidden]"
      style={back ? { transform: 'rotateY(180deg)' } : undefined}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[0.9rem] border-2 border-[#2fa8ff] bg-[linear-gradient(160deg,#0a1226_0%,#0d1c3c_55%,#081022_100%)] p-[0.9em] text-[clamp(0.82rem,3.1vh,1.2rem)] shadow-[0_0_2.4rem_rgba(47,168,255,0.6),inset_0_0_1.8rem_rgba(47,168,255,0.16)]">
        <div className="pointer-events-none absolute inset-[0.3em] rounded-[0.6rem] border border-[#2fa8ff]/40" />
        <div className="relative h-full">{children}</div>
      </div>
    </div>
  )
}

function Shield() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.3em] w-[1.3em] text-[#2fa8ff]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3l7 2.6v5.6c0 4.4-3 8-7 9.4-4-1.4-7-5-7-9.4V5.6z" />
      <path d="M12 9v3M12 15h.01" strokeLinecap="round" />
    </svg>
  )
}

function Star({ on }: { on: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-[0.62em] w-[0.62em] ${on ? 'text-[#2fa8ff]' : 'text-[#243252]'}`}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z" />
    </svg>
  )
}
