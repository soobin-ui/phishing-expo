import { motion } from 'framer-motion'
import { fill, situations, ui } from '../lib/content'

/** 글자가 한 줄씩 밀려 올라오는 공통 동작 */
const rise = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
} as const

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
} as const

/**
 * [0] 첫 화면 — 받아볼 문자를 고릅니다.
 *
 * ★ 카드에 "무슨 문자가 오는지" 설명을 붙이지 마세요.
 *   미리 알려주면 궁금하지가 않습니다. 상황 이름만 보여주고 열어보게 둡니다.
 *   (situations 의 desc 는 운영자 메모로만 남겨둔 것입니다)
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
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="flex h-full w-full flex-col px-10 py-12"
    >
      {/* ── 행사 타이틀 ── */}
      <div className="shrink-0 text-center">
        <motion.p variants={rise} className="text-[31px] font-bold text-blue-600">
          {m.eyebrow}
        </motion.p>
        <motion.p
          variants={rise}
          className="mt-2 text-[56px] leading-tight font-extrabold text-slate-900"
        >
          {m.title}
        </motion.p>

        <motion.div variants={rise} className="mx-auto mt-7 h-px w-28 bg-slate-300" />

        <motion.h1
          variants={rise}
          className="mt-7 text-[74px] leading-[1.15] font-extrabold tracking-tight text-slate-900"
        >
          {m.headline}
        </motion.h1>
        <motion.p variants={rise} className="mt-6 text-[30px] text-slate-500">
          {m.tagline}
        </motion.p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 py-8">
        {situations.map((s, i) => (
          <SituationCard
            key={s.id}
            label={s.label}
            cta={m.cta}
            index={i}
            onClick={() => onPick(s.id)}
          />
        ))}
      </div>

      <motion.p
        variants={rise}
        className="shrink-0 text-center text-[21px] text-slate-400 tabular-nums"
      >
        {fill(m.todayCount, { n: todayCount })}
      </motion.p>
    </motion.div>
  )
}

/**
 * 상황 카드.
 * 화살표가 계속 오른쪽으로 밀립니다 — 누르는 자리라는 걸 가만히 있어도 알 수 있게.
 */
function SituationCard({
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
      variants={rise}
      whileTap={{ scale: 0.985 }}
      className="flex shrink-0 items-center gap-5 rounded-3xl border-2 border-slate-200 bg-white px-9 py-8 text-left shadow-[0_8px_24px_rgba(15,23,42,0.06)] active:border-blue-400 active:bg-blue-50"
    >
      <p className="min-w-0 flex-1 text-[38px] leading-tight font-extrabold text-slate-900">
        {label}
      </p>

      <div className="flex shrink-0 items-center gap-2.5 text-blue-600">
        <span className="text-[23px] font-bold">{cta}</span>
        <motion.svg
          width="28"
          height="28"
          viewBox="0 0 26 26"
          aria-hidden="true"
          animate={{ x: [0, 8, 0] }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: index * 0.18,
          }}
        >
          <path
            d="M4 13h16M14 6l7 7-7 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
      </div>
    </motion.button>
  )
}
