import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import mascot from '../assets/mascot.webp'
import mascot2 from '../assets/mascot2.webp'
import { EventPill, TapButton } from '../components/Buttons'
import { ScrollScreen } from '../components/Stage'
import { ui } from '../lib/content'
import { CautionTape, CyberBackdrop, Magnifier, MailIcon, PhoneIcon, SmsIcon } from '../components/Cyber'

const rise = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
} as const

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
} as const

/**
 * [첫 화면] 역할 소개 — "당신은 피싱 전문 수사관입니다!"
 *
 * 체험관에 들어온 사람에게 먼저 역할을 줍니다. 주제 고르기는 그다음 화면입니다.
 * [수사 시작하기] → 사건(주제) 고르기 → 고르면 바로 시작.
 *
 * ★ 행사 이름(알약)은 첫 화면에 꼭 보여야 합니다. 빼지 마세요.
 * ★ '피싱 전문 수사관' 뱃지는 제목과 중복이라 뺐습니다(2026-09-18 피드백). 다시 넣지 마세요.
 * ★ 캐릭터는 QR 페이지의 두 친구 그대로입니다(돋보기 든 친구가 수사관 역할).
 * ★ 이모지 금지 — 아이콘은 모두 SVG 로 그립니다.
 *
 * 세로 화면: 장면 위 / 글 아래.  가로 화면: 장면 왼쪽 / 글 오른쪽.
 */
export function IntroScreen({ onStart }: { onStart: () => void }) {
  const t = ui.intro
  const lines = t.body.split(String.fromCharCode(10))

  return (
    <div className="relative h-full w-full bg-[#050a18]">
      <CyberBackdrop />

      <ScrollScreen className="relative z-10">
        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger}
          className="mx-auto flex w-full max-w-[36rem] flex-1 flex-col items-center justify-center px-6 pt-[max(1rem,2.5dvh)] pb-[calc(clamp(2.6rem,6dvh,3.4rem)+1.2rem)] text-center wide:max-w-[76rem] wide:flex-row wide:gap-[4%] wide:px-[5%] wide:pt-6"
        >
          {/* ── 장면: 두 캐릭터 + 레이더 + 수상한 메시지들 ── */}
          <div className="flex w-full flex-col items-center wide:min-w-0 wide:flex-1">
            <motion.div variants={rise} className="wide:hidden">
              <EventPill className="bg-[#1a3f6b] text-[0.95rem] text-[#dceeff]" />
              <ZoneTitle />
            </motion.div>
            <motion.div variants={rise} className="w-full">
              <Scene />
            </motion.div>
          </div>

          {/* ── 글 ── */}
          <div className="flex w-full flex-col items-center wide:w-[min(32rem,46%)] wide:flex-none">
            <motion.div variants={rise} className="hidden wide:block">
              <EventPill className="bg-[#1a3f6b] text-[1rem] text-[#dceeff]" />
              <ZoneTitle />
            </motion.div>

            <motion.h1
              variants={rise}
              className="mt-[min(1.2rem,2.2dvh)] font-display text-[min(2.25rem,8.2vw)] leading-[1.25] font-bold text-white [text-shadow:0_0_1.2rem_rgba(47,168,255,0.75)] wide:mt-7 wide:text-[min(2.7rem,4.2vw)]"
            >
              {t.title}
            </motion.h1>

            <motion.p
              variants={rise}
              className="mt-[min(0.8rem,1.4dvh)] text-[1.15rem] leading-relaxed text-white/75"
            >
              {lines.map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </motion.p>

            <motion.div variants={rise} className="mt-[min(1.6rem,3dvh)] w-full max-w-[26rem]">
              <TapButton onClick={onStart} pulse>
                <span className="inline-flex items-center gap-2">
                  <Magnifier className="h-[1.1em] w-[1.1em]" />
                  {t.start}
                </span>
              </TapButton>
            </motion.div>
          </div>
        </motion.div>
      </ScrollScreen>

      <CautionTape text={t.tape} />
    </div>
  )
}

/** 행사 알약 아래 — 안전체험관 | 온라인 피싱 체험존 (주제 고르기 화면과 같은 이름) */
function ZoneTitle() {
  return (
    <p className="mt-[clamp(0.7rem,calc(10.8dvh_-_3.36rem),1.6rem)] flex items-center justify-center gap-[0.6em] font-display text-[min(1.45rem,5.6vw)] leading-none font-bold text-white wide:text-[1.6rem]">
      <span className="text-gold">{ui.menu.title}</span>
      <span className="h-[0.9em] w-[2px] rounded-full bg-white/30" aria-hidden="true" />
      <span>{ui.menu.headline}</span>
    </p>
  )
}

/**
 * 두 캐릭터가 서 있고, 뒤에서 레이더가 돌며 수상한 메일·문자·전화를 잡아냅니다.
 * 높이는 화면 높이를 따라가서 폰·태블릿·노트북 모두 한 화면에 들어옵니다.
 *
 * ★ 가로 화면에서는 폭(34vw)으로도 묶어 둡니다(2026-09-19).
 *   높이만 보고 크기를 정하면 1080×810 처럼 납작한 화면에서 장면이 옆으로 자라
 *   오른쪽 글과 [수사 시작하기] 가 화면 밖으로 잘렸습니다.
 */
function Scene() {
  return (
    <div className="relative mx-auto mt-[min(0.6rem,1dvh)] aspect-[10/8] h-[min(31dvh,30rem)] max-w-full wide:mt-0 wide:h-[min(64dvh,30rem,34vw)]">
      {/* 레이더 */}
      <div className="absolute top-[2%] left-1/2 aspect-square h-[88%] -translate-x-1/2">
        <div className="absolute inset-0 rounded-full border border-[#2fa8ff]/45 bg-[radial-gradient(circle,rgba(22,104,196,0.28),rgba(5,10,24,0)_70%)]" />
        <div className="absolute inset-[17%] rounded-full border border-[#2fa8ff]/30" />
        <div className="absolute inset-[34%] rounded-full border border-[#2fa8ff]/20" />
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#2fa8ff]/20" />
        <div className="absolute top-1/2 right-0 left-0 h-px bg-[#2fa8ff]/20" />
        <motion.div
          className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,rgba(127,212,255,0.45),rgba(127,212,255,0)_22%,transparent)]"
          animate={{ rotate: 360 }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* 수상한 메시지들 — 레이더에 잡힌 표적 */}
      <Suspect className="top-[6%] left-[4%]" delay={0}>
        <MailIcon />
      </Suspect>
      <Suspect className="top-[14%] right-[3%]" delay={0.7}>
        <SmsIcon />
      </Suspect>
      <Suspect className="top-[48%] left-[0%]" delay={1.4}>
        <PhoneIcon />
      </Suspect>

      {/* 발판 */}
      <div className="absolute inset-x-[14%] bottom-[1%] h-[14%] rounded-[50%] border-2 border-[#2fa8ff]/70 bg-[radial-gradient(ellipse,rgba(47,168,255,0.45),transparent_70%)] shadow-[0_0_1.6rem_rgba(47,168,255,0.55)]" />

      {/* 캐릭터 둘 */}
      <div className="absolute inset-x-0 bottom-[6%] flex h-[80%] items-end justify-center">
        <motion.img
          src={mascot}
          alt=""
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          className="relative h-[86%] w-auto object-contain drop-shadow-[0_0_0.8rem_rgba(47,168,255,0.7)]"
        />
        <motion.img
          src={mascot2}
          alt=""
          animate={{ y: [0, -7, 0], rotate: [0, -3, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          className="relative -ml-[4%] h-[96%] w-auto object-contain drop-shadow-[0_0_0.8rem_rgba(47,168,255,0.7)]"
        />
      </div>
    </div>
  )
}

/** 레이더에 잡힌 수상한 메시지 — 빨간 경고 점이 깜빡입니다 */
function Suspect({
  children,
  className,
  delay,
}: {
  children: ReactNode
  className: string
  delay: number
}) {
  return (
    <motion.div
      className={`absolute z-10 ${className}`}
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      <div className="relative flex h-[clamp(2.3rem,6dvh,3.2rem)] w-[clamp(2.3rem,6dvh,3.2rem)] items-center justify-center rounded-xl border border-[#2fa8ff]/55 bg-[#0b1631]/90 text-[#9fe0ff] shadow-[0_0_1rem_rgba(47,168,255,0.4)]">
        {children}
        <motion.span
          className="absolute -top-1.5 -right-1.5 flex h-[1.15rem] w-[1.15rem] items-center justify-center rounded-full bg-[#e5484d] font-display text-[0.72rem] leading-none font-bold text-white"
          animate={{ scale: [1, 1.22, 1], opacity: [1, 0.75, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, delay }}
        >
          !
        </motion.span>
      </div>
    </motion.div>
  )
}

