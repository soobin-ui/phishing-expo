import { motion } from 'framer-motion'
import { TapButton } from '../components/Buttons'
import { ui } from '../lib/content'

/**
 * [2] 결과 연출 — 직접 쓴 답에 따라 '넘어감 / 안 넘어감'이 갈립니다.
 *
 * ★ 여기서 "내가 방금 뭘 넘겼는지"를 목록으로 보여줍니다.
 *   이게 '아차' 하는 순간을 만듭니다. 금액이나 피해 규모는 절대 표시하지 않습니다.
 *
 * ★ 자동으로 넘기지 않고 버튼을 누르게 합니다.
 *   버튼 글자가 다음 화면(어디서 알아챌 수 있었는지)으로 이어지는 다리 역할을 합니다.
 */
export function CaughtScreen({
  defended,
  gave,
  onNext,
}: {
  defended: boolean
  gave: string[]
  onNext: () => void
}) {
  const c = ui.caught

  return (
    <motion.div
      className="flex h-full w-full flex-col justify-center px-10 py-14"
      initial={{ backgroundColor: '#0a0d16' }}
      animate={{ backgroundColor: defended ? '#0d3b2e' : '#7f1414' }}
      transition={{ duration: 0.35 }}
    >
      <motion.div
        animate={{ x: defended ? 0 : [0, -8, 8, -5, 5, 0] }}
        transition={{ duration: 0.45, delay: 0.25 }}
        className="shrink-0 text-center"
      >
        <p className="mb-6 text-[86px]">{defended ? '🛡️' : '⚠️'}</p>
        <p className="text-[46px] leading-snug font-extrabold text-white">
          {defended ? c.safeTitle : c.title}
        </p>
      </motion.div>

      {/* 방금 넘긴 것들 */}
      <div className="mt-10 shrink-0">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mb-4 text-center text-[24px] font-bold text-white/70"
        >
          {gave.length > 0 ? c.gaveTitle : c.gaveNone}
        </motion.p>

        <div className="flex flex-col gap-3">
          {gave.map((item, i) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.9 + i * 0.35 }}
              className="flex items-center gap-4 border-l-4 border-white/60 bg-black/25 px-6 py-5"
            >
              <span className="text-[30px]">✔</span>
              <span className="text-[28px] font-bold text-white">{item}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 1.2 + gave.length * 0.35 }}
        className="mt-12 shrink-0"
      >
        <TapButton tone="ghost" onClick={onNext}>
          {c.next}
        </TapButton>
      </motion.div>
    </motion.div>
  )
}
