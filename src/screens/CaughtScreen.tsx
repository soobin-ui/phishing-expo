import { motion } from 'framer-motion'
import { TapButton } from '../components/Buttons'
import { ScrollScreen } from '../components/Stage'
import { ui } from '../lib/content'

/**
 * [2] 결과 연출 — 직접 쓴 답에 따라 '넘어감 / 안 넘어감'이 갈립니다.
 *
 * ★ 여기서 "내가 방금 뭘 넘겼는지"를 목록으로 보여줍니다.
 *   이게 '아차' 하는 순간을 만듭니다. 금액이나 피해 규모는 절대 표시하지 않습니다.
 *
 * ★ 자동으로 넘기지 않고 버튼을 누르게 합니다.
 *   버튼 글자가 다음 화면(어디서 알아챌 수 있었는지)으로 이어지는 다리 역할을 합니다.
 *
 * 세로 화면: 경고 → 넘긴 것 → 버튼.  가로 화면: 경고 왼쪽 | 넘긴 것·버튼 오른쪽.
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
      className="h-full w-full"
      initial={{ backgroundColor: '#0e1633' }}
      animate={{ backgroundColor: defended ? '#0c3a31' : '#861a1f' }}
      transition={{ duration: 0.35 }}
    >
      <ScrollScreen className="justify-center">
        <div className="mx-auto flex w-full max-w-[36rem] flex-col px-6 py-10 wide:max-w-[70rem] wide:flex-row wide:items-center wide:gap-[6%] wide:px-[5%]">
          <motion.div
            animate={{ x: defended ? 0 : [0, -8, 8, -5, 5, 0] }}
            transition={{ duration: 0.45, delay: 0.25 }}
            className="shrink-0 text-center wide:flex-1 wide:text-left"
          >
            <div className="mx-auto h-[4.6rem] w-[4.6rem] text-white wide:mx-0 wide:h-[5.6rem] wide:w-[5.6rem]">
              {defended ? <ShieldIcon /> : <WarningIcon />}
            </div>
            <p className="mt-6 font-display text-[min(2.1rem,8vw)] leading-snug font-bold text-white wide:text-[min(2.8rem,4.2vw)]">
              {defended ? c.safeTitle : c.title}
            </p>
          </motion.div>

          <div className="mt-10 shrink-0 wide:mt-0 wide:w-[min(30rem,46%)]">
            {/* 방금 넘긴 것들 */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mb-3.5 text-center text-[1.1rem] font-bold text-white/70 wide:text-left"
            >
              {gave.length > 0 ? c.gaveTitle : c.gaveNone}
            </motion.p>

            <div className="flex flex-col gap-2.5">
              {gave.map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.9 + i * 0.35 }}
                  className="flex items-center gap-3.5 rounded-xl bg-black/25 px-5 py-3.5"
                >
                  <svg viewBox="0 0 24 24" className="h-[1.3rem] w-[1.3rem] shrink-0" aria-hidden="true">
                    <path
                      d="M4 12.5l5 5L20 6.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-[1.3rem] font-bold text-white">{item}</span>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 1.2 + gave.length * 0.35 }}
              className="mt-9"
            >
              <TapButton tone="ghost" onClick={onNext}>
                {c.next}
              </TapButton>
            </motion.div>
          </div>
        </div>
      </ScrollScreen>
    </motion.div>
  )
}

/** 경고 삼각형 — QR 페이지 네온 경고와 같은 모양(점멸은 하지 않음) */
function WarningIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
      <path
        d="M32 7 L59 55 H5 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinejoin="round"
      />
      <path d="M32 24 V39" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <circle cx="32" cy="47" r="3.2" fill="currentColor" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
      <path
        d="M32 5 L54 13 V30 C54 44 44 54 32 59 C20 54 10 44 10 30 V13 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinejoin="round"
      />
      <path
        d="M22 32 l7 7 l13 -14"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
