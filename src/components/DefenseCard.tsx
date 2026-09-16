import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import mascot from '../assets/mascot.webp'
import { TapButton } from './Buttons'
import { fill, ui } from '../lib/content'
import type { RedFlag } from '../types'

/**
 * 검거 완료 — 캐릭터가 먼저 나오고, 이어서 '피싱 방어력 카드'가 돌아가며 나옵니다.
 *
 * ★ 두 박자입니다.
 *   1) 캐릭터 + "검거 완료"      (약 1.5초)
 *   2) 카드가 한 바퀴 반 돌면서 짠 (게임에서 카드 뽑을 때처럼)
 *
 * ★ 캐릭터는 홍보 포스터·QR 페이지와 같은 인물입니다(src/assets/mascot.webp).
 *   포스터의 사이버 느낌은 이미지 자체가 아니라 파란 네온 배경·테두리로 냅니다.
 *
 * 별점은 실제 조사 기록에서 나옵니다 — 찍어서 별 다섯 개가 나오지 않게.
 */
export interface Stats {
  /** 찾은 곳 / 전체 */
  found: number
  total: number
  /** 조사 방법을 틀리게 고른 횟수 */
  wrongs: number
  /** 수상하지 않은 곳을 누른 횟수 */
  misses: number
  /** 링크·첨부 두 곳을 모두 잡았는지 */
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
  /** 카드 아래에 붙는 '이 메일이 쓴 수법' 정리 */
  flags: RedFlag[]
  solved: string[]
  onNext: () => void
}) {
  const t = ui.investigate
  const all = stats.found >= stats.total
  const [stage, setStage] = useState<'hit' | 'card'>('hit')

  useEffect(() => {
    const id = window.setTimeout(() => setStage('card'), 1500)
    return () => window.clearTimeout(id)
  }, [])

  const rows = [
    { label: t.card.detect, sub: 'PHISHING DETECTION', n: clamp(Math.round((stats.found / stats.total) * 5)) },
    { label: t.card.react, sub: 'SECURITY REACTION', n: clamp(5 - stats.wrongs) },
    { label: t.card.protect, sub: 'INFO PROTECTION', n: clamp(5 - stats.misses) },
    { label: t.card.block, sub: 'ANTI VIRUS', n: clamp(1 + stats.blocked * 2) },
  ]
  const score = rows.reduce((sum, r) => sum + r.n, 0)
  const rank = score >= 18 ? t.card.rankHigh : score >= 13 ? t.card.rankMid : t.card.rankLow

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-50 flex flex-col bg-[#050a18]"
    >
      {/* 사이버 배경 — 격자와 파란 번짐 */}
      <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_18%,rgba(47,168,255,0.28),transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(47,168,255,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(47,168,255,0.10)_1px,transparent_1px)] bg-[size:2.2rem_2.2rem]" />
      </div>

      <div className="no-scrollbar relative z-10 min-h-0 flex-1 overflow-y-auto px-5 py-[max(1rem,3vh)]">
        <div className="mx-auto flex w-full max-w-[30rem] flex-col items-center">
          {/* 1박자 — 캐릭터와 검거 완료 */}
          <motion.div
            initial={{ scale: 0.4, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14 }}
            className="relative flex flex-col items-center"
          >
            <motion.img
              src={mascot}
              alt=""
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              className="h-[clamp(6rem,22vh,9rem)] w-auto drop-shadow-[0_0_1.2rem_rgba(47,168,255,0.85)]"
            />
            <motion.p
              initial={{ scale: 1.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.25, type: 'spring', stiffness: 300, damping: 15 }}
              className="mt-2 font-display text-[clamp(2rem,9vw,2.8rem)] leading-none font-bold text-white [text-shadow:0_0_1.4rem_rgba(47,168,255,0.9),0_0_0.4rem_rgba(255,255,255,0.7)]"
            >
              {all ? t.caughtTitle : t.failTitle}
            </motion.p>
            <p className="mt-2 text-[0.98rem] text-sky/80">
              {all ? fill(t.caughtBody, { n: stats.total }) : t.failBody}
            </p>
          </motion.div>

          {/* 2박자 — 카드가 돌면서 등장 */}
          {stage === 'card' && (
            <div className="mt-5 w-full [perspective:1200px]">
              <motion.div
                initial={{ rotateY: 540, scale: 0.55, opacity: 0 }}
                animate={{ rotateY: 0, scale: 1, opacity: 1 }}
                transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1] }}
                className="relative [transform-style:preserve-3d]"
                data-role="defense-card"
              >
                {/* 뒷면 — 도는 동안 보입니다(앞면 글자가 거울처럼 비치지 않게) */}
                <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border-2 border-[#2fa8ff] bg-[linear-gradient(135deg,#0a142e_0%,#122a55_50%,#0a142e_100%)] shadow-[0_0_2.2rem_rgba(47,168,255,0.55)]">
                    <div className="rounded-full border-2 border-[#2fa8ff]/70 p-5">
                      <svg viewBox="0 0 24 24" className="h-[3rem] w-[3rem] text-[#2fa8ff]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <circle cx="10.5" cy="10.5" r="6.5" />
                        <path d="M15.5 15.5L21 21" strokeLinecap="round" />
                      </svg>
                    </div>
                    <p className="mt-3 font-display text-[0.8rem] font-bold tracking-[0.25em] text-[#2fa8ff]">
                      {t.card.zone}
                    </p>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl border-2 border-[#2fa8ff] bg-[#070d1e] p-4 shadow-[0_0_2.2rem_rgba(47,168,255,0.55),inset_0_0_1.6rem_rgba(47,168,255,0.18)] [backface-visibility:hidden]">
                  {/* 카드 안쪽 네온 테두리 */}
                  <div className="pointer-events-none absolute inset-[0.35rem] rounded-xl border border-[#2fa8ff]/45" />

                  <p className="text-center font-display text-[0.8rem] font-bold tracking-[0.25em] text-[#2fa8ff]">
                    {t.card.zone}
                  </p>
                  <p className="mt-1.5 text-center font-display text-[clamp(1.5rem,6.5vw,2rem)] leading-tight font-bold text-white [text-shadow:0_0_1rem_rgba(47,168,255,0.8)]">
                    {rank}
                  </p>

                  <div className="mt-3.5 flex flex-col gap-2">
                    {rows.map((r, i) => (
                      <motion.div
                        key={r.label}
                        initial={{ opacity: 0, x: -14 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.05 + i * 0.16 }}
                        className="flex items-center gap-2.5 rounded-lg border border-[#2fa8ff]/25 bg-[#0c1530] px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[0.98rem] leading-tight font-bold text-white">{r.label}</p>
                          <p className="text-[0.62rem] tracking-wider text-[#5b7aa8]">{r.sub}</p>
                        </div>
                        <div className="flex shrink-0 gap-0.5">
                          {[0, 1, 2, 3, 4].map((k) => (
                            <motion.span
                              key={k}
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: 1.2 + i * 0.16 + k * 0.07 }}
                            >
                              <Star on={k < r.n} />
                            </motion.span>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <p className="mt-3 text-center font-display text-[0.72rem] tracking-wider text-[#5b7aa8]">
                    {t.card.footer}
                  </p>
                </div>
              </motion.div>
            </div>
          )}

          {stage === 'card' && (
            <>
              {/* 이 메일이 쓴 수법 — 카드 밑에 정리 */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.95 }}
                className="mt-5 flex w-full flex-col gap-2"
              >
                <p className="text-[0.9rem] font-bold text-[#5b7aa8]">{t.card.tricks}</p>
                {flags.map((f) => (
                  <div
                    key={f.target}
                    className={`rounded-xl border-l-4 px-3.5 py-2.5 text-left ${
                      solved.includes(f.target)
                        ? 'border-[#2fa8ff] bg-[#0c1530]'
                        : 'border-white/15 bg-white/[0.03]'
                    }`}
                  >
                    <p className="text-[0.98rem] font-bold text-white">{f.label}</p>
                    <p className="mt-0.5 text-[0.9rem] leading-snug text-white/60">{f.explain}</p>
                  </div>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.1 }}
                className="mt-5 w-full"
              >
                <TapButton onClick={onNext}>{t.cardNext}</TapButton>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function Star({ on }: { on: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-[0.95rem] w-[0.95rem] ${on ? 'text-[#2fa8ff]' : 'text-[#23304f]'}`}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z" />
    </svg>
  )
}
