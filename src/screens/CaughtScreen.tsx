import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { ui } from '../lib/content'

/** [6] 당함 연출 — 2초. 금액이나 피해 규모는 절대 표시하지 않습니다. */
export function CaughtScreen({ onNext }: { onNext: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onNext, 2200)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <motion.div
      className="flex h-full w-full flex-col items-center justify-center bg-[#7f1414] px-8"
      initial={{ backgroundColor: '#0a0d16' }}
      animate={{ backgroundColor: '#7f1414' }}
      transition={{ duration: 0.35 }}
    >
      <motion.div
        animate={{ x: [0, -8, 8, -5, 5, 0] }}
        transition={{ duration: 0.45, delay: 0.25 }}
        className="text-center"
      >
        <p className="mb-6 text-[64px]">⚠️</p>
        <p className="text-[36px] leading-snug font-extrabold text-white">{ui.caught.title}</p>
      </motion.div>
    </motion.div>
  )
}
