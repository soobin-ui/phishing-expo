import { motion } from 'framer-motion'
import { ScrollScreen } from '../components/Stage'
import { BadgeIcon, CautionTape, ChannelIcon, CyberBackdrop } from '../components/Cyber'
import { scenarioFor, situations, ui } from '../lib/content'

const rise = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
} as const

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
} as const

/**
 * 사건 고르기 — 첫 화면(수사관 소개) 바로 다음.
 *
 * ★ 첫 화면과 이어지는 어두운 수사관 톤입니다(같은 격자 바탕 · 같은 수사 테이프).
 * ★ 행사 이름·체험존 이름은 첫 화면에 이미 있으니 여기서는 빼고, 사건 목록만 둡니다.
 * ★ 사건 카드에 "무슨 내용이 오는지" 설명을 붙이지 마세요.
 *   미리 알려주면 궁금하지가 않습니다. 주제 이름과 받는 방식(메일·문자·메신저·전화) 아이콘만.
 */
export function MenuScreen({ onPick }: { onPick: (situationId: string) => void }) {
  const m = ui.menu

  return (
    <div className="relative h-full w-full bg-[#050a18]">
      <CyberBackdrop />

      <ScrollScreen className="relative z-10">
        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger}
          className="mx-auto flex w-full max-w-[40rem] flex-1 flex-col justify-center px-6 pt-[max(1.2rem,3vh)] pb-[calc(clamp(2.6rem,6vh,3.4rem)+1.6rem)]"
        >
          <header className="text-center">
            <motion.span
              variants={rise}
              className="inline-flex items-center gap-2 rounded-md border border-[#2fa8ff]/60 bg-[#0b1631] px-3 py-1.5 font-display text-[0.95rem] font-bold text-[#7fd4ff] shadow-[0_0_1rem_rgba(47,168,255,0.35)]"
            >
              <BadgeIcon />
              {ui.intro.badge}
            </motion.span>
            <motion.h1
              variants={rise}
              className="mt-[min(0.9rem,1.6vh)] font-display text-[min(2rem,6.4vw)] leading-tight font-bold text-white [text-shadow:0_0_1.2rem_rgba(47,168,255,0.75)]"
            >
              {m.tagline}
            </motion.h1>
          </header>

          <ul className="mt-[min(1.6rem,3vh)] flex flex-col gap-[min(0.75rem,1.4vh)]">
            {situations.map((s, i) => (
              <motion.li key={s.id} variants={rise}>
                <CaseRow
                  no={i + 1}
                  label={s.label}
                  channel={scenarioFor(s.id).channel}
                  cta={m.cta}
                  onClick={() => onPick(s.id)}
                />
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </ScrollScreen>

      <CautionTape text={ui.intro.tape} />
    </div>
  )
}

/** 사건 한 건 — 네온 테두리 사건 파일. 화살표가 계속 밀려서 누르는 자리인 걸 알 수 있게 */
function CaseRow({
  no,
  label,
  channel,
  cta,
  onClick,
}: {
  no: number
  label: string
  channel: string
  cta: string
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.985 }}
      className="group flex min-h-[clamp(4.2rem,9.5vh,5.2rem)] w-full items-center gap-4 rounded-2xl max-[380px]:gap-3 border border-[#2fa8ff]/40 bg-[#0b1631]/85 px-4 py-2.5 text-left shadow-[0_0_1.2rem_rgba(47,168,255,0.12),inset_0_0_1.2rem_rgba(47,168,255,0.06)] transition-colors active:border-gold active:bg-[#12224a] wide:px-5"
    >
      <span className="flex h-[2.9rem] w-[2.9rem] shrink-0 items-center justify-center rounded-xl border border-[#2fa8ff]/50 bg-[#050a18] text-[#9fe0ff]">
        <ChannelIcon channel={channel} className="h-[58%] w-[58%]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[0.75rem] leading-none font-bold tracking-[0.16em] text-[#6f93c4] tabular-nums">
          CASE {String(no).padStart(2, '0')}
        </span>
        <span className="mt-1.5 block text-[1.35rem] leading-tight font-bold text-white">
          {label}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2.5">
        <span className="text-[0.95rem] font-semibold text-gold/85 max-[380px]:hidden">{cta}</span>
        <span className="flex h-[2.2rem] w-[2.2rem] items-center justify-center rounded-full bg-gold text-navy-deep shadow-[0_0_0.9rem_rgba(254,202,54,0.45)]">
          <motion.svg
            width="55%"
            height="55%"
            viewBox="0 0 26 26"
            aria-hidden="true"
            animate={{ x: [0, 3, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: no * 0.18 }}
          >
            <path
              d="M4 13h16M14 6l7 7-7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        </span>
      </span>
    </motion.button>
  )
}
