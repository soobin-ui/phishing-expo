import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { EventPill } from '../components/Buttons'
import { ScrollScreen } from '../components/Stage'
import { fill, situations, ui } from '../lib/content'

/** 글자가 한 줄씩 밀려 올라오는 공통 동작 */
const rise = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
} as const

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
} as const

/**
 * [0] 첫 화면 — 체험할 주제를 고릅니다.
 *
 * ★ 카드에 "무슨 문자가 오는지" 설명을 붙이지 마세요.
 *   미리 알려주면 궁금하지가 않습니다. 상황 이름만 보여주고 열어보게 둡니다.
 *   (situations 의 desc 는 운영자 메모로만 남겨둔 것입니다)
 *
 * ★ 휴대폰 QR 페이지·포스터와 같은 집안으로 보이게 하는 장치는 딱 네 가지입니다.
 *   남색 알약 머리표 · 지마켓 산스 제목 · 금색 버튼 · 아래쪽 금색 아크와 남색 띠.
 *   캐릭터·색종이는 넣지 않습니다(체험은 담백하게).
 *
 * 세로 화면: 제목 위 / 목록 아래.  가로 화면: 제목 왼쪽 / 목록 오른쪽.
 */
export function MenuScreen({
  onPick,
  todayCount,
}: {
  onPick: (situationId: string) => void
  todayCount: number
}) {
  const m = ui.menu

  return (
    <ScrollScreen className="relative">
      <motion.div
        initial="hidden"
        animate="show"
        variants={stagger}
        className="relative z-10 mx-auto flex w-full max-w-[36rem] flex-1 flex-col px-6 pt-[max(2rem,6vh)] pb-[calc(clamp(3.2rem,10vh,6rem)+1.25rem)] wide:max-w-[76rem] wide:flex-row wide:items-center wide:gap-[5%] wide:px-[5%] wide:pt-8"
      >
        {/* ── 행사 타이틀 ── */}
        <header className="relative shrink-0 text-center wide:flex-1 wide:text-left">
          <Sparks />
          <motion.div variants={rise}>
            <EventPill className="text-[1.05rem]" />
          </motion.div>
          <motion.p
            variants={rise}
            className="mt-[0.9em] font-display text-[2rem] leading-tight font-bold text-navy wide:text-[2.3rem]"
          >
            {m.title}
          </motion.p>
          <motion.h1
            variants={rise}
            className="mt-[0.25em] font-display text-[min(2.9rem,10vw)] leading-[1.18] font-bold tracking-[-0.02em] text-navy wide:text-[min(3.6rem,6vw)]"
          >
            {m.headline}
          </motion.h1>
          <motion.div
            variants={rise}
            className="mx-auto mt-[min(1.25rem,2.4vh)] h-[0.3rem] w-14 rounded-full bg-gold wide:mx-0"
          />
          <motion.p
            variants={rise}
            className="mt-[min(1.25rem,2.4vh)] text-[1.2rem] leading-snug text-navy/60 wide:text-[1.3rem]"
          >
            {m.tagline}
          </motion.p>
        </header>

        {/* ── 상황 목록 ── */}
        <div className="flex flex-1 flex-col justify-center py-[min(1.75rem,3.5vh)] wide:w-[min(32rem,48%)] wide:flex-none wide:py-0">
          <motion.ul
            variants={rise}
            className="divide-y divide-navy/10 overflow-hidden rounded-3xl border border-navy/10 bg-white shadow-[0_0.8rem_2.4rem_rgba(38,59,124,0.10)]"
          >
            {situations.map((s, i) => (
              <li key={s.id}>
                <SituationRow
                  label={s.label}
                  cta={m.cta}
                  index={i}
                  onClick={() => onPick(s.id)}
                />
              </li>
            ))}
          </motion.ul>
        </div>
      </motion.div>

      <PosterBand>{fill(m.todayCount, { n: todayCount })}</PosterBand>
    </ScrollScreen>
  )
}

/**
 * 상황 한 줄.
 * 화살표가 계속 오른쪽으로 밀립니다 — 누르는 자리라는 걸 가만히 있어도 알 수 있게.
 */
function SituationRow({
  label,
  cta,
  index,
  onClick,
}: {
  label: string
  cta: string
  index: number
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.99 }}
      className="flex min-h-[4.3rem] w-full items-center gap-4 px-5 py-3 text-left active:bg-sky-pale wide:min-h-[4.6rem] wide:px-6"
    >
      <span className="w-[1.6em] shrink-0 font-display text-[0.95rem] font-bold text-navy/30 tabular-nums">
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className="min-w-0 flex-1 text-[1.4rem] leading-tight font-bold text-navy">
        {label}
      </span>
      <span className="flex shrink-0 items-center gap-2.5">
        <span className="text-[0.95rem] font-semibold text-navy/55">{cta}</span>
        <span className="flex h-[2.2rem] w-[2.2rem] items-center justify-center rounded-full bg-gold text-navy-deep">
          <motion.svg
            width="55%"
            height="55%"
            viewBox="0 0 26 26"
            aria-hidden="true"
            animate={{ x: [0, 3, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: index * 0.18 }}
          >
            <path
              d="M4 13h16M14 6l7 7-7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        </span>
      </span>
    </motion.button>
  )
}

/**
 * 포스터 아래쪽의 금색 아크 + 남색 띠 — QR 페이지 첫 화면과 같은 마감.
 * non-scaling-stroke 라 화면 폭이 늘어나도 금색 선 굵기는 그대로입니다.
 */
function PosterBand({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[clamp(3.2rem,10vh,6rem)]">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 430 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0 38 C118 6 300 2 430 26 L430 100 L0 100 Z" fill="var(--color-navy)" />
        <path
          d="M-6 30 C118 -3 302 -7 436 17"
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth="5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <p className="absolute inset-x-0 bottom-0 flex h-[62%] items-center justify-center text-[0.95rem] text-white/60 tabular-nums">
        {children}
      </p>
    </div>
  )
}

/** 제목 둘레 별빛 세 개 — 포스터의 반짝임을 아주 조금만 */
function Sparks() {
  const items = [
    { cls: 'left-[4%] top-[8%] w-[1.1rem] wide:-left-[3%]', c: 'var(--color-sky)', d: '0s' },
    { cls: 'right-[6%] top-[30%] w-[0.8rem] wide:right-[10%]', c: 'var(--color-gold)', d: '1.2s' },
    { cls: 'right-[14%] -top-[2%] w-[0.65rem] wide:right-[30%]', c: 'var(--color-sky)', d: '2.3s' },
  ]
  return (
    <>
      {items.map((s, i) => (
        <svg
          key={i}
          className={`spark ${s.cls}`}
          style={{ animationDelay: s.d }}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z"
            fill={s.c}
          />
        </svg>
      ))}
    </>
  )
}
