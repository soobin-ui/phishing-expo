import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { TapButton } from '../components/Buttons'
import { ScrollScreen } from '../components/Stage'
import { CautionTape, ChannelIcon, CyberBackdrop } from '../components/Cyber'
import { scenarioFor, situations, ui } from '../lib/content'

/** 이름 최대 글자 수 — 메일 첫 줄("{name} 교수님께,")이 한 줄에 들어오는 길이 */
export const NAME_MAX = 12

/** 앞뒤 공백·겹친 공백을 정리하고 길이를 자릅니다 */
export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX)
}

const rise = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
} as const

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
} as const

/**
 * 이름 입력 — 사건을 고른 직후, 사건 브리핑 전.
 *
 * 여기서 받은 이름이 시나리오 글의 {name} 자리에 들어갑니다(예: 메일 첫 줄 "홍길동 교수님께,").
 * 내 이름이 적힌 메일이 오면 "체험존이니까 가짜겠지"가 깨집니다 — 그게 이 화면의 이유입니다.
 *
 * ★ 이름은 화면 상태로만 들고 있고 어디에도 저장하지 않습니다(기록 CSV 에도 없음).
 * ★ 빈 이름으로는 시작할 수 없습니다. 태블릿 화면 키보드로 치므로 입력창은 크게.
 */
export function NameScreen({
  situationId,
  onSubmit,
  onBack,
}: {
  situationId: string
  onSubmit: (name: string) => void
  onBack: () => void
}) {
  const t = ui.name
  const no = Math.max(0, situations.findIndex((s) => s.id === situationId)) + 1
  const label = situations.find((s) => s.id === situationId)?.label ?? ''
  const channel = scenarioFor(situationId).channel

  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const name = cleanName(value)
  const ok = name.length > 0

  // 화면이 뜬 뒤 입력창에 커서 — 태블릿에서는 눌러야 키보드가 뜨는 기종도 있어 실패해도 상관없습니다
  useEffect(() => {
    const id = window.setTimeout(() => inputRef.current?.focus(), 400)
    return () => window.clearTimeout(id)
  }, [])

  const submit = () => {
    if (ok) onSubmit(name)
  }

  return (
    <div className="relative h-full w-full bg-[#050a18]">
      <CyberBackdrop />

      <ScrollScreen className="relative z-10">
        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger}
          className="mx-auto flex w-full max-w-[34rem] flex-1 flex-col items-center justify-center px-6 pt-[max(1.2rem,3dvh)] pb-[calc(clamp(2.6rem,6dvh,3.4rem)+1.6rem)] text-center"
        >
          {/* 고른 사건 */}
          <motion.span
            variants={rise}
            className="inline-flex items-center gap-2 rounded-full border border-[#2fa8ff]/45 bg-[#0b1631]/90 py-1.5 pr-4 pl-1.5 text-[0.95rem] font-bold text-[#9fe0ff]"
          >
            <span className="flex h-[1.9rem] w-[1.9rem] items-center justify-center rounded-full border border-[#2fa8ff]/50 bg-[#050a18]">
              <ChannelIcon channel={channel} className="h-[56%] w-[56%]" />
            </span>
            <span className="font-display tracking-[0.12em] text-[#6f93c4] tabular-nums">
              CASE {String(no).padStart(2, '0')}
            </span>
            <span className="text-white">{label}</span>
          </motion.span>

          <motion.p
            variants={rise}
            className="mt-[min(1.4rem,2.6dvh)] font-display text-[0.9rem] font-bold tracking-[0.18em] text-gold"
          >
            {t.eyebrow}
          </motion.p>
          <motion.h1
            variants={rise}
            className="mt-2 font-display text-[min(2rem,7vw)] leading-tight font-bold text-white [text-shadow:0_0_1.2rem_rgba(47,168,255,0.75)]"
          >
            {t.title}
          </motion.h1>
          <motion.p variants={rise} className="mt-2 text-[1.1rem] text-white/70">
            {t.body}
          </motion.p>

          <motion.form
            variants={rise}
            className="mt-[min(1.6rem,3dvh)] w-full"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={NAME_MAX}
              placeholder={t.placeholder}
              enterKeyHint="done"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              data-role="name-input"
              className="w-full rounded-2xl border-2 border-[#2fa8ff]/60 bg-[#0b1631] px-5 py-4 text-center font-display text-[1.7rem] font-bold text-white shadow-[0_0_1.2rem_rgba(47,168,255,0.2)] outline-none placeholder:font-sans placeholder:text-[1.2rem] placeholder:font-normal placeholder:text-white/30 focus:border-gold focus:shadow-[0_0_1.6rem_rgba(254,202,54,0.35)]"
            />
            <p className="mt-2.5 text-[0.9rem] text-white/45">{t.privacy}</p>

            <div className="mt-[min(1.4rem,2.6dvh)]">
              <TapButton onClick={submit} disabled={!ok}>
                {t.start}
              </TapButton>
            </div>
          </motion.form>

          <motion.button
            variants={rise}
            type="button"
            data-role="name-back"
            onClick={onBack}
            className="mt-4 rounded-lg px-3 py-2 text-[1rem] font-semibold text-white/55 active:text-white"
          >
            ‹ {t.back}
          </motion.button>
        </motion.div>
      </ScrollScreen>

      <CautionTape text={ui.intro.tape} />
    </div>
  )
}
