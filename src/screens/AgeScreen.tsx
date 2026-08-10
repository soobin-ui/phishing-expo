import { motion } from 'framer-motion'
import { ageGroups, ui } from '../lib/content'

/** [A-1] 연령대 고르기 — 고른 연령대에 실제로 많이 오는 수법으로 진행됩니다. */
export function AgeScreen({
  onPick,
  onBack,
}: {
  onPick: (ageGroupId: string) => void
  onBack: () => void
}) {
  return (
    <div className="flex h-full w-full flex-col px-6 pt-[max(36px,env(safe-area-inset-top))] pb-[max(28px,env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 shrink-0 self-start px-2 py-2 text-[19px] font-semibold text-slate-400"
      >
        ← {ui.age.back}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="shrink-0"
      >
        <h1 className="text-[34px] leading-[1.28] font-extrabold whitespace-pre-line text-slate-900">
          {ui.age.title}
        </h1>
        <p className="mt-3 text-[19px] leading-relaxed text-slate-500">{ui.age.sub}</p>
      </motion.div>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 py-6">
        {ageGroups.map((group, i) => (
          <motion.button
            key={group.id}
            type="button"
            onClick={() => onPick(group.id)}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, delay: 0.1 + i * 0.07, ease: 'easeOut' }}
            whileTap={{ scale: 0.98 }}
            className="flex min-h-[96px] flex-1 items-center justify-between rounded-2xl border-2 border-slate-200 bg-white px-6 active:bg-blue-50"
          >
            <span className="text-[30px] font-extrabold text-slate-900">{group.label}</span>
            <span className="text-[19px] font-medium text-slate-400">{group.note}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
