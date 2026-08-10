import { motion } from 'framer-motion'
import { fill, ui } from '../lib/content'
import type { Track } from '../types'

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
    <div className="flex h-full w-full flex-col px-6 pt-[max(40px,env(safe-area-inset-top))] pb-[max(28px,env(safe-area-inset-bottom))]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="shrink-0 text-center"
      >
        <p className="text-[19px] font-semibold text-blue-600">{m.eyebrow}</p>
        <h1 className="mt-3 text-[38px] leading-[1.25] font-extrabold whitespace-pre-line text-slate-900">
          {m.headline}
        </h1>
        <p className="mt-4 text-[21px] text-slate-500">{m.sub}</p>
      </motion.div>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-5 py-6">
        <Card
          delay={0.15}
          badge={m.chat.badge}
          title={m.chat.title}
          desc={m.chat.desc}
          tone="chat"
          onClick={() => onPick('chat')}
        />
        <Card
          delay={0.28}
          badge={m.quiz.badge}
          title={m.quiz.title}
          desc={m.quiz.desc}
          tone="quiz"
          onClick={() => onPick('quiz')}
        />
      </div>

      <p className="shrink-0 text-center text-[18px] text-slate-400 tabular-nums">
        {fill(m.todayCount, { n: todayCount })}
      </p>
    </div>
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
  delay,
  onClick,
}: {
  badge: string
  title: string
  desc: string
  tone: 'chat' | 'quiz'
  delay: number
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: 'easeOut' }}
      whileTap={{ scale: 0.98 }}
      className={`flex shrink-0 flex-col justify-center rounded-3xl border-2 px-7 py-9 text-left shadow-[0_10px_30px_rgba(15,23,42,0.07)] ${toneClass[tone]}`}
    >
      <span
        className={`inline-block self-start rounded-full px-3.5 py-1.5 text-[16px] font-bold ${badgeClass[tone]}`}
      >
        {badge}
      </span>
      <p className="mt-4 text-[32px] leading-tight font-extrabold text-slate-900">{title}</p>
      <p className="mt-3 text-[21px] leading-relaxed whitespace-pre-line text-slate-500">{desc}</p>
    </motion.button>
  )
}
