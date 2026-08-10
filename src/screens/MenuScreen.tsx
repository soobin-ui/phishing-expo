import { motion } from 'framer-motion'
import { fill, ui } from '../lib/content'
import type { Track } from '../types'

/** 글자가 한 줄씩 밀려 올라오는 공통 동작 */
const rise = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
} as const

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
} as const

/** [0] 첫 화면 — 시나리오 체험 / 피싱 찾기 퀴즈 둘 중 하나를 고릅니다. */
export function MenuScreen({
  onPick,
  todayCount,
}: {
  onPick: (track: Track) => void
  todayCount: number
}) {
  const m = ui.menu

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="flex h-full w-full flex-col px-10 py-14"
    >
      {/* ── 행사 타이틀 ── */}
      <div className="shrink-0 text-center">
        <motion.p variants={rise} className="text-[24px] font-bold text-blue-600">
          {m.eyebrow}
        </motion.p>
        <motion.p
          variants={rise}
          className="mt-1 text-[40px] leading-tight font-extrabold text-slate-900"
        >
          {m.title}
        </motion.p>

        <motion.div variants={rise} className="mx-auto mt-6 h-px w-24 bg-slate-300" />

        <motion.h1
          variants={rise}
          className="mt-6 text-[52px] leading-tight font-extrabold text-slate-900"
        >
          {m.headline}
        </motion.h1>
        <motion.p variants={rise} className="mt-4 text-[26px] text-slate-500">
          {m.tagline}
        </motion.p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-6">
        <motion.p variants={rise} className="text-center text-[22px] font-medium text-slate-400">
          {m.sub}
        </motion.p>

        <Card
          badge={m.chat.badge}
          title={m.chat.title}
          desc={m.chat.desc}
          tone="chat"
          onClick={() => onPick('chat')}
        />
        <Card
          badge={m.quiz.badge}
          title={m.quiz.title}
          desc={m.quiz.desc}
          tone="quiz"
          onClick={() => onPick('quiz')}
        />
      </div>

      <motion.p
        variants={rise}
        className="shrink-0 text-center text-[20px] text-slate-400 tabular-nums"
      >
        {fill(m.todayCount, { n: todayCount })}
      </motion.p>
    </motion.div>
  )
}

const toneClass = {
  chat: 'border-blue-200 bg-white active:bg-blue-50',
  quiz: 'border-slate-200 bg-white active:bg-slate-50',
}

const badgeClass = {
  chat: 'bg-blue-600 text-white',
  quiz: 'bg-slate-800 text-white',
}

function Card({
  badge,
  title,
  desc,
  tone,
  onClick,
}: {
  badge: string
  title: string
  desc: string
  tone: 'chat' | 'quiz'
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      variants={rise}
      whileTap={{ scale: 0.98 }}
      className={`flex shrink-0 flex-col justify-center rounded-3xl border-2 px-9 py-10 text-left shadow-[0_10px_30px_rgba(15,23,42,0.08)] ${toneClass[tone]}`}
    >
      <span
        className={`inline-block self-start rounded-full px-4 py-1.5 text-[19px] font-bold ${badgeClass[tone]}`}
      >
        {badge}
      </span>
      <p className="mt-5 text-[38px] leading-tight font-extrabold text-slate-900">{title}</p>
      <p className="mt-4 text-[24px] leading-relaxed whitespace-pre-line text-slate-500">{desc}</p>
    </motion.button>
  )
}
