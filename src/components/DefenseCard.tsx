import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import mascot from '../assets/mascot.webp'
import mascot2 from '../assets/mascot2.webp'
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

/** 주제마다 바뀌는 문구 — 없으면 연구실(메일) 문구를 씁니다 */
export interface CardCopy {
  caughtBody?: string
  failTitle?: string
  failBody?: string
  tricks?: string
  missed?: string
  missedShort?: string
  allSeen?: string
  allSeenSub?: string
}

export function DefenseCard({
  stats,
  flags,
  solved,
  copy = {},
  onNext,
}: {
  stats: Stats
  flags: RedFlag[]
  solved: string[]
  copy?: CardCopy
  onNext: () => void
}) {
  const t = ui.investigate
  const c = {
    caughtBody: copy.caughtBody ?? t.caughtBody,
    failTitle: copy.failTitle ?? t.failTitle,
    failBody: copy.failBody ?? t.failBody,
    tricks: copy.tricks ?? t.card.tricks,
    missed: copy.missed ?? t.card.missed,
    missedShort: copy.missedShort ?? t.card.missedShort,
    allSeen: copy.allSeen ?? t.card.allSeen,
    allSeenSub: copy.allSeenSub ?? t.card.allSeenSub,
  }
  const all = stats.found >= stats.total
  const [shown, setShown] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [trick, setTrick] = useState(0)
  /** 오른쪽 칸에 꽂힌 수법 번호들 — [다음]을 누른 순서대로 */
  const [dealt, setDealt] = useState<number[]>([])
  const allDealt = dealt.length >= flags.length
  const flag = flags[Math.min(trick, flags.length - 1)]

  /** [다음] — 지금 보던 카드를 칸으로 돌리고, 다음 수법을 큰 카드에 */
  const deal = () => {
    if (allDealt) return
    setDealt((d) => (d.includes(trick) ? d : [...d, trick]))
    if (trick < flags.length - 1) setTrick(trick + 1)
  }

  useEffect(() => {
    const id = window.setTimeout(() => setShown(true), 700)
    return () => window.clearTimeout(id)
  }, [])

  const rows = [
    { label: t.card.detect, sub: 'PHISHING DETECTION', icon: <IconDetect />, n: clamp(Math.round((stats.found / stats.total) * 5)) },
    { label: t.card.react, sub: 'SECURITY REACTION', icon: <IconLock />, n: clamp(5 - stats.wrongs) },
    { label: t.card.protect, sub: 'INFO PROTECTION', icon: <IconInfo />, n: clamp(5 - stats.misses) },
    { label: t.card.block, sub: 'ANTI VIRUS', icon: <IconVirus />, n: clamp(1 + stats.blocked * 2) },
  ]
  const score = rows.reduce((sum, r) => sum + r.n, 0)
  const rank = score >= 18 ? t.card.rankHigh : score >= 13 ? t.card.rankMid : t.card.rankLow

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
          {all ? t.caughtTitle : c.failTitle}
        </motion.p>
        <p className="mt-1.5 text-[0.92rem] text-sky/75">
          {all ? fill(c.caughtBody, { n: stats.total }) : c.failBody}
        </p>
      </div>

      {/* ②③ 카드 + 버튼.
          앞면: 카드 한 장이 가운데.
          뒷면(flipped): 큰 카드가 왼쪽으로 밀려나고 오른쪽에 2×2 빈 칸이 생깁니다.
          [다음]을 누를 때마다 지금 보던 수법 카드가 작은 카드가 되어 빈 칸으로 날아가 꽂히고(카드 게임에서 패 돌리듯),
          큰 카드에는 다음 수법이 나타납니다. 1번 왼쪽 위 → 2번 오른쪽 위 → 3번 왼쪽 아래 → 4번 오른쪽 아래.
          ★ 날아가는 움직임은 framer-motion 의 layoutId 공유(큰 카드 속 내용 ↔ 칸 속 작은 카드가 같은 id). */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-3">
        <div className="flex w-full max-w-[46rem] flex-col items-center gap-2.5">
        <div className="flex w-full items-center justify-center gap-[4%]">
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 210, damping: 26 }}
          className={`[perspective:1400px] ${flipped ? 'w-[min(22rem,50%,40vh)]' : 'w-[min(24rem,86vw,40vh)]'}`}
        >
        {shown && (
          <motion.div
            initial={{ rotateY: 900, scale: 0.35, opacity: 0 }}
            animate={{ rotateY: flipped ? 180 : 0, scale: 1, opacity: 1 }}
            transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1] }}
            data-role="defense-card"
            className="relative w-full [transform-style:preserve-3d]"
            style={{ aspectRatio: '5 / 7' }}
          >
            {/* ── 앞면 ── */}
            <CardFace>
              <div className="flex h-full flex-col">
                {/* 윗줄 — CYBER SAFETY ZONE 띠 */}
                <div className="rounded-full bg-[#1a3f6b] px-2 py-[0.34em] text-center font-display text-[0.66em] leading-none font-bold tracking-[0.14em] text-[#7fd4ff]">
                  {t.card.zone}
                </div>

                {/* 캐릭터 둘 사이에 홀로그램 방패 */}
                <div className="relative flex min-h-0 flex-1 items-end justify-center py-[0.3em]">
                  <div className="absolute inset-x-0 bottom-[6%] mx-auto h-[80%] w-[92%] rounded-full bg-[radial-gradient(circle,rgba(47,168,255,0.38),transparent_66%)]" />
                  <motion.img
                    src={mascot}
                    alt=""
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative h-[76%] w-auto object-contain drop-shadow-[0_0_0.5em_rgba(47,168,255,0.8)]"
                  />
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative z-10 -mx-[7%] mb-[8%] h-[80%] w-[42%] shrink-0"
                  >
                    <HoloShield />
                  </motion.div>
                  <motion.img
                    src={mascot2}
                    alt=""
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
                    className="relative h-[68%] w-auto object-contain drop-shadow-[0_0_0.5em_rgba(47,168,255,0.8)]"
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
                      className="flex flex-col items-center rounded-[0.4em] border border-[#2fa8ff]/30 bg-[#0b1631] px-[0.35em] py-[0.42em] text-center"
                    >
                      <span className="text-[#dceeff]">{r.icon}</span>
                      <p className="mt-[0.22em] text-[0.6em] leading-tight font-bold text-white">{r.label}</p>
                      <p className="text-[0.42em] leading-tight tracking-[0.06em] text-[#6f93c4]">{r.sub}</p>
                      <div className="mt-[0.28em] flex justify-center gap-[0.1em]">
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

            {/* ── 뒷면 — 지금 보는 수법 한 장 (다 돌리고 나면 '모두 확인') ── */}
            <CardFace back>
              <div className="flex h-full flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="flex-1 font-display text-[0.8em] font-bold text-[#7fd4ff]">
                    {c.tricks}
                  </span>
                  <span className="font-display text-[0.75em] font-bold text-white tabular-nums">
                    {Math.min(dealt.length + 1, flags.length)} / {flags.length}
                  </span>
                </div>

                <div className="relative min-h-0 flex-1">
                  {allDealt ? (
                    <motion.div
                      key="all-seen"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.35, type: 'spring', stiffness: 260, damping: 18 }}
                      data-role="all-seen"
                      className="flex h-full flex-col items-center justify-center text-center"
                    >
                      <span className="flex h-[3em] w-[3em] items-center justify-center rounded-full bg-[#2fa8ff] text-[#050a18]">
                        <svg viewBox="0 0 24 24" className="h-[60%] w-[60%]" fill="none" stroke="currentColor" strokeWidth="3.2" aria-hidden="true">
                          <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <p className="mt-[0.8em] font-display text-[1.05em] leading-snug font-bold whitespace-pre-line text-white">
                        {fill(c.allSeen, { n: flags.length })}
                      </p>
                      <p className="mt-[0.5em] text-[0.72em] leading-relaxed text-[#b9cbe6]">{c.allSeenSub}</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={`big-${trick}`}
                      layoutId={`deal-${trick}`}
                      data-role="trick-slide"
                      className="flex h-full flex-col justify-center"
                    >
                      <span className="flex h-[2.2em] w-[2.2em] items-center justify-center rounded-full bg-[#2fa8ff] font-display text-[1em] font-bold text-[#050a18]">
                        {trick + 1}
                      </span>
                      <p className="mt-[0.6em] text-[1em] leading-snug font-bold text-white">{flag.label}</p>
                      <p className="mt-[0.45em] text-[0.78em] leading-relaxed text-[#b9cbe6]">{flag.explain}</p>
                      {!solved.includes(flag.target) && (
                        <p className="mt-[0.5em] text-[0.68em] font-bold text-[#ffb4b4]">{c.missed}</p>
                      )}
                    </motion.div>
                  )}
                </div>

                {!allDealt && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      data-role="next-trick"
                      onClick={deal}
                      className="rounded-full bg-[#2fa8ff] px-[1.1em] py-[0.4em] font-display text-[0.75em] font-bold text-[#050a18] active:bg-[#1d8ede]"
                    >
                      {t.card.nextTrick}
                    </button>
                  </div>
                )}
              </div>
            </CardFace>
          </motion.div>
        )}
        </motion.div>

        {/* 오른쪽 2×2 칸 — 뒷면을 볼 때만. 돌린 카드가 차례로 꽂힙니다 */}
        {flipped && (
          <motion.div
            layout
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 210, damping: 26, delay: 0.45 }}
            data-role="deal-grid"
            className="grid w-[min(17rem,40%)] grid-cols-2 gap-[0.5rem]"
          >
            {flags.map((f, k) => (
              <div
                key={f.target}
                data-role="deal-slot"
                className="relative rounded-[0.6rem] border-2 border-dashed border-[#2fa8ff]/35"
                style={{ aspectRatio: '5 / 7' }}
              >
                <span className="absolute top-1 left-1.5 font-display text-[0.7rem] font-bold text-[#2fa8ff]/45 tabular-nums">
                  {k + 1}
                </span>
                {dealt.includes(k) && (
                  <motion.div
                    layoutId={`deal-${k}`}
                    transition={{ type: 'spring', stiffness: 170, damping: 22 }}
                    data-role="dealt-card"
                    className="absolute inset-0 flex flex-col overflow-hidden rounded-[0.6rem] border-2 border-[#2fa8ff] bg-[linear-gradient(160deg,#0a1226_0%,#0d1c3c_55%,#081022_100%)] p-[0.45rem] text-[clamp(0.6rem,1.9vh,0.85rem)] shadow-[0_0_1.2rem_rgba(47,168,255,0.55)]"
                  >
                    <span className="flex h-[1.9em] w-[1.9em] items-center justify-center rounded-full bg-[#2fa8ff] font-display text-[0.9em] font-bold text-[#050a18]">
                      {k + 1}
                    </span>
                    <p className="mt-[0.5em] text-[0.95em] leading-snug font-bold text-white">{f.label}</p>
                    {!solved.includes(f.target) && (
                      <span className="mt-auto inline-block self-start rounded-full bg-[#ffb4b4]/20 px-[0.5em] py-[0.15em] text-[0.7em] font-bold text-[#ffb4b4]">
                        {c.missedShort}
                      </span>
                    )}
                  </motion.div>
                )}
              </div>
            ))}
          </motion.div>
        )}
        </div>

        {/* 버튼 — 앞면 카드와 같은 폭 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: shown ? 1 : 0, y: shown ? 0 : 10 }}
          transition={{ delay: 1.5 }}
          className="flex w-[min(24rem,86vw,40vh)] flex-col gap-2"
        >
          <motion.button
            type="button"
            data-role="flip-card"
            onClick={() => setFlipped((v) => !v)}
            animate={{
              boxShadow: [
                '0 0 0.5rem rgba(47,168,255,0.45)',
                '0 0 1.5rem rgba(47,168,255,0.9)',
                '0 0 0.5rem rgba(47,168,255,0.45)',
              ],
            }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#7fd4ff] bg-[#1668c4] px-4 py-3.5 font-display text-[1.15rem] font-bold text-white active:bg-[#12539e]"
          >
            <Flip />
            {flipped ? t.card.flipFront : t.card.flipBack}
          </motion.button>
          <button
            type="button"
            onClick={onNext}
            className="w-full rounded-xl border-2 border-transparent bg-gold px-4 py-3.5 font-display text-[1.15rem] font-bold text-navy-deep active:bg-gold-deep"
          >
            {t.cardNext}
          </button>
        </motion.div>
        </div>
      </div>
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

/** 두 캐릭터 사이의 홀로그램 방패 — 자물쇠와 도는 고리 */
function HoloShield() {
  return (
    <svg viewBox="0 0 100 120" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="shieldFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7fd4ff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#1668c4" stopOpacity="0.28" />
        </linearGradient>
      </defs>
      <g style={{ filter: 'drop-shadow(0 0 6px rgba(47,168,255,0.95))' }}>
        <path
          d="M50 6l38 14v34c0 26-16 46-38 56C28 100 12 80 12 54V20z"
          fill="url(#shieldFill)"
          stroke="#9fe0ff"
          strokeWidth="3"
        />
        <path
          d="M50 16l29 10.6V54c0 20.5-12.3 36.4-29 44.6C33.3 90.4 21 74.5 21 54V26.6z"
          fill="none"
          stroke="#cdeeff"
          strokeWidth="1.4"
          opacity="0.75"
        />
        {/* 자물쇠 */}
        <rect x="36" y="52" width="28" height="24" rx="4" fill="#dff3ff" opacity="0.92" />
        <path d="M41 52v-7a9 9 0 0118 0v7" fill="none" stroke="#dff3ff" strokeWidth="5" />
        <circle cx="50" cy="63" r="4" fill="#1668c4" />
        <rect x="48.4" y="63" width="3.2" height="7" rx="1.6" fill="#1668c4" />
      </g>
      {/* 도는 고리 */}
      <ellipse cx="50" cy="72" rx="47" ry="12" fill="none" stroke="#2fa8ff" strokeWidth="2.4" opacity="0.8" />
      <ellipse cx="50" cy="60" rx="44" ry="10" fill="none" stroke="#7fd4ff" strokeWidth="1.6" opacity="0.5" />
    </svg>
  )
}

/** 방어력 상자 아이콘 — 첨부한 포스터의 네 가지 */
function IconDetect() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.25em] w-[1.25em]" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M12 3l7.5 2.8v5.5c0 4.7-3.2 8.6-7.5 10.1-4.3-1.5-7.5-5.4-7.5-10.1V5.8z" />
      <path d="M12 8.2l1.2 2.6 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4z" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.25em] w-[1.25em]" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="5" y="10" width="14" height="11" rx="2.5" />
      <path d="M8 10V7a4 4 0 018 0v3" />
      <circle cx="12" cy="15" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconInfo() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.25em] w-[1.25em]" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M4 6h16v10H9l-5 4z" />
      <path d="M8 11h3M13 11h3" strokeLinecap="round" />
    </svg>
  )
}

function IconVirus() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.25em] w-[1.25em]" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" strokeLinecap="round" />
      <path d="M4 20L20 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}

/** 뒤집기 아이콘 */
function Flip() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.15em] w-[1.15em]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 0114.5-7.1M21 12a9 9 0 01-14.5 7.1" />
      <path d="M17 2.5V6h-3.5M7 21.5V18h3.5" />
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
