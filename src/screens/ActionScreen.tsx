import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TapButton } from '../components/Buttons'
import { ScrollScreen } from '../components/Stage'
import { BadgeIcon } from '../components/Cyber'
import { fill, ui } from '../lib/content'

const AUTO_RESET = 40 // 초

/**
 * [4] 마지막 화면 — 실제로 당했을 때 무엇을 해야 하는지.
 *
 * ★ 전화번호를 함부로 바꾸지 마세요. 공개 전시물에 틀린 번호를 띄우면 안 됩니다.
 *   112  경찰청 — 지급정지·신고
 *   1332 금융감독원 — 피해 상담·환급
 *   118  한국인터넷진흥원 — 피싱사이트·스미싱 신고
 */
export function ActionScreen({
  found,
  total,
  safety,
  onReset,
}: {
  found: number
  total: number
  safety: number
  onReset: () => void
}) {
  const a = ui.action
  const [left, setLeft] = useState(AUTO_RESET)

  useEffect(() => {
    const id = window.setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          onReset()
          return 0
        }
        return v - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ★ 등급을 나누지 않습니다 — 몇 개를 찾았든 "사건 해결!" + CASE CLOSED (2026-09-18 사용자 결정).
  //   "놓친 단서가 있습니다"·"사기범을 놓쳤습니다" 같은 아쉬움 문구는 뺐습니다. 찾은 개수는 아래 줄에만.
  void safety
  const grade = a.gradeHigh
  const solved = true

  return (
    <ScrollScreen className="justify-center">
      <div className="mx-auto flex w-full max-w-[38rem] flex-col px-6 pt-[max(1.25rem,3vh)] pb-5 wide:max-w-[76rem] wide:flex-row wide:items-center wide:gap-[5%] wide:px-[5%] wide:py-8">
        {/* ── 왼쪽 칸(가로) / 위(세로): 결과 한 줄 + 제목 + (가로) 버튼 ── */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
          className="shrink-0 text-center wide:flex wide:flex-1 wide:flex-col wide:text-left"
        >
          {/* 수사 종료 배지 + 도장 */}
          <motion.div variants={rise} className="flex items-center justify-center gap-3.5 wide:justify-start">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[#2fa8ff]/60 bg-[#0b1631] px-2.5 py-1.5 font-display text-[0.9rem] leading-none font-bold text-[#7fd4ff] shadow-[0_0_1rem_rgba(47,168,255,0.3)]">
              <BadgeIcon />
              {a.eyebrow}
            </span>
            <motion.span
              initial={{ scale: 2.2, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 0.95, rotate: -8 }}
              transition={{ delay: 0.6, type: 'spring', stiffness: 420, damping: 14 }}
              className={`inline-block rounded-md border-[3px] px-2 py-0.5 font-display text-[0.95rem] font-bold tracking-[0.08em] whitespace-nowrap ${
                solved ? 'border-gold text-gold' : 'border-[#ff6b6b] text-[#ff6b6b]'
              }`}
            >
              {solved ? a.stampClosed : a.stampOpen}
            </motion.span>
          </motion.div>
          <motion.p
            variants={rise}
            className="mt-3 font-display text-[min(2.1rem,8vw)] leading-tight font-bold text-white [text-shadow:0_0_1.1rem_rgba(47,168,255,0.7)] wide:text-[min(2.3rem,3.4vw)]"
          >
            {grade}
          </motion.p>
          <motion.p
            variants={rise}
            className="mt-2 flex items-center justify-center gap-2 text-[1.1rem] text-gold tabular-nums wide:justify-start"
          >
            {fill(a.score, { found, total })}
            <span className="inline-flex gap-1" aria-hidden="true">
              {Array.from({ length: total }, (_, i) => (
                <span
                  key={i}
                  className={`h-[0.85rem] w-[0.85rem] rounded-[0.2rem] ${i < found ? 'bg-gold' : 'bg-white/15'}`}
                />
              ))}
            </span>
          </motion.p>

          <motion.div variants={rise} className="mx-auto my-[min(1.5rem,2.5vh)] h-px w-16 bg-white/20 wide:mx-0 wide:my-6" />

          <motion.h2
            variants={rise}
            className="font-display text-[min(1.8rem,7vw)] leading-snug font-bold whitespace-pre-line text-white wide:text-[min(2.5rem,3.6vw)]"
          >
            {a.title}
          </motion.h2>

          <motion.div variants={rise} className="mt-8 hidden wide:block">
            <Again label={a.again} note={fill(a.autoReset, { n: left })} onReset={onReset} />
          </motion.div>
        </motion.div>

        {/* ── 오른쪽 칸(가로) / 아래(세로): 해야 할 일 4가지 ── */}
        <div className="mt-[min(1.75rem,3vh)] flex flex-col gap-2 wide:mt-0 wide:gap-2.5 wide:w-[min(34rem,52%)]">
          {a.steps.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.42, delay: 0.5 + i * 0.14 }}
              className="flex items-start gap-4 rounded-xl bg-white/[0.06] px-4 py-3 wide:px-5 wide:py-3.5"
            >
              <span className="flex h-[2rem] w-[2rem] shrink-0 items-center justify-center rounded-full bg-gold font-display text-[1.05rem] font-bold text-navy-deep tabular-nums">
                {step.n}
              </span>
              <div className="min-w-0">
                <p className="text-[1.2rem] leading-snug font-bold text-white">{step.title}</p>
                <p className="mt-1 text-[0.98rem] leading-snug text-white/65">{step.desc}</p>
              </div>
            </motion.div>
          ))}

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 1.15 }}
            className="mt-1 rounded-xl border border-white/20 px-4 py-3 text-[0.98rem] wide:px-5 wide:py-3.5 leading-snug text-white/70"
          >
            {a.app}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 1.3 }}
          className="mt-[min(1.75rem,3vh)] shrink-0 wide:hidden"
        >
          <Again label={a.again} note={fill(a.autoReset, { n: left })} onReset={onReset} />
        </motion.div>
      </div>
    </ScrollScreen>
  )
}

function Again({ label, note, onReset }: { label: string; note: string; onReset: () => void }) {
  return (
    <>
      <TapButton onClick={onReset}>{label}</TapButton>
      <p className="mt-2.5 text-center text-[0.9rem] text-white/35 tabular-nums wide:text-left">
        {note}
      </p>
    </>
  )
}

const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
} as const
