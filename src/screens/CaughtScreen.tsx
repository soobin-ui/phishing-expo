import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { ui } from '../lib/content'

/**
 * [A-3] 결과 연출 — 2초. 금액이나 피해 규모는 절대 표시하지 않습니다.
 * 직접 쓴 답장에 따라 '넘어감 / 안 넘어감'이 갈립니다.
 */
export function CaughtScreen({ defended, onNext }: { defended: boolean; onNext: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onNext, 2200)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <motion.div
      className="flex h-full w-full flex-col items-center justify-center px-8"
      initial={{ backgroundColor: '#0a0d16' }}
      animate={{ backgroundColor: defended ? '#0d3b2e' : '#7f1414' }}
      transition={{ duration: 0.35 }}
    >
      <motion.div
        animate={{ x: [0, -8, 8, -5, 5, 0] }}
        transition={{ duration: 0.45, delay: 0.25 }}
        className="text-center"
      >
        <p className="mb-6 text-[86px]">{defended ? '🛡️' : '⚠️'}</p>
        <p className="text-[48px] leading-snug font-extrabold text-white">
          {defended ? ui.caught.safeTitle : ui.caught.title}
        </p>
      </motion.div>
    </motion.div>
  )
}
