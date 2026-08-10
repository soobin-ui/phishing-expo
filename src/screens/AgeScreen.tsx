import { motion } from 'framer-motion'
import { ageGroups, ui } from '../lib/content'

const rise = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
} as const

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
} as const

/** [A-1] 연령대 고르기 — 고른 연령대에 실제로 많이 오는 수법으로 진행됩니다. */
export function AgeScreen({
  onPick,
  onBack,
}: {
  onPick: (ageGroupId: string) => void
  onBack: () => void
}) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="flex h-full w-full flex-col px-10 py-14"
    >
      <motion.button
        variants={rise}
        type="button"
        onClick={onBack}
        className="mb-6 shrink-0 self-start px-2 py-2 text-[23px] font-semibold text-slate-400"
      >
        ← {ui.age.back}
      </motion.button>

      <div className="shrink-0">
        <motion.h1
          variants={rise}
          className="text-[44px] leading-[1.3] font-extrabold whitespace-pre-line text-slate-900"
        >
          {ui.age.title}
        </motion.h1>
        <motion.p variants={rise} className="mt-5 text-[23px] leading-relaxed text-slate-500">
          {ui.age.sub}
        </motion.p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-5 py-8">
        {ageGroups.map((group) => (
          <motion.button
            key={group.id}
            variants={rise}
            type="button"
            onClick={() => onPick(group.id)}
            whileTap={{ scale: 0.98 }}
            className="flex min-h-[124px] flex-1 items-center justify-between rounded-2xl border-2 border-slate-200 bg-white px-8 active:bg-blue-50"
          >
            <span className="text-[38px] font-extrabold text-slate-900">{group.label}</span>
            <span className="text-[23px] font-medium text-slate-400">{group.note}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}
