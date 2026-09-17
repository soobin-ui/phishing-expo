import { useCallback, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Stage } from './components/Stage'
import { TapButton } from './components/Buttons'
import { IntroScreen } from './screens/IntroScreen'
import { MenuScreen } from './screens/MenuScreen'
import { ArriveScreen } from './screens/ArriveScreen'
import { MailScreen } from './screens/MailScreen'
import { ForensicScreen } from './screens/ForensicScreen'
import { ChatScreen } from './screens/ChatScreen'
import { CaughtScreen } from './screens/CaughtScreen'
import { FindScreen } from './screens/FindScreen'
import { ActionScreen } from './screens/ActionScreen'
import { AdminScreen } from './screens/AdminScreen'
import { fill, scenarioFor, situations, ui } from './lib/content'
import { useIdleTimer } from './lib/useIdleTimer'
import { newSessionId, saveRecord } from './lib/stats'
import type { Act, Step } from './types'

/** ?topic=rnd|job|family|agency —시연용 바로가기(키오스크는 주소에 아무것도 붙이지 않음) */
const START_TOPIC = (() => {
  try {
    const q = new URLSearchParams(window.location.search).get('topic')
    const w = (window as { __TOPIC__?: string }).__TOPIC__
    const id = q ?? w ?? ''
    return situations.some((s) => s.id === id) ? id : ''
  } catch {
    return ''
  }
})()

/** 화면마다 배경 색감이 바뀝니다. 밝게 시작해서 어두워집니다. */
const ACT_OF: Record<Step, Act> = {
  intro: 'dark',
  menu: 'dark',
  arrive: 'dark',
  chat: 'dark',
  caught: 'dark',
  find: 'counter',
  action: 'counter',
  admin: 'dark',
}

/**
 * 흐름은 한 줄기입니다.
 *   역할 소개 → 사건 고르기 → 문자 받고 직접 답장 → 넘어갔나 → 그 문자에서 3곳 찾기 → 정리
 *
 * ★ '찾기'를 앞으로 빼거나 따로 떼어내지 마세요.
 *   직접 당해본 직후여야 찾을 마음이 생깁니다.
 */
export default function App() {
  // 링크로 주제를 정해 열면(?topic=rnd) 첫 화면을 건너뛰고 바로 그 주제가 시작됩니다 — 시연·검토용
  const [step, setStep] = useState<Step>(() => (START_TOPIC ? 'arrive' : 'intro'))
  const [situation, setSituation] = useState(START_TOPIC)
  const [safety, setSafety] = useState(100)
  const [found, setFound] = useState(0)
  /** 대화 중 넘겨준 것들 — 당한 직후 '이걸 넘겼습니다'로 보여줍니다 */
  const [gave, setGave] = useState<string[]>([])
  /** 전화 [끊기]를 눌렀는지 — 끊었으면 안전도와 상관없이 '넘어가지 않음' */
  const [hungUp, setHungUp] = useState(false)

  const sessionRef = useRef({ id: newSessionId(), startedAt: Date.now() })
  const savedRef = useRef(false)

  const scenario = useMemo(() => scenarioFor(situation), [situation])

  /** 안전도 60 이상이거나 전화를 끊었으면 넘어가지 않은 것으로 봅니다 */
  const defended = hungUp || safety >= 60

  const reset = useCallback(() => {
    sessionRef.current = { id: newSessionId(), startedAt: Date.now() }
    savedRef.current = false
    setSituation('')
    setSafety(100)
    setFound(0)
    setGave([])
    setHungUp(false)
    setStep('intro')
  }, [])

  // 채팅 중에는 타이핑하느라 화면을 안 건드릴 수 있어 자동 리셋을 걸지 않습니다
  const idleRemaining = useIdleTimer({
    enabled: step !== 'intro' && step !== 'admin' && step !== 'action' && step !== 'chat',
    onReset: reset,
  })

  const start = (situationId: string) => {
    sessionRef.current = { id: newSessionId(), startedAt: Date.now() }
    setSituation(situationId)
    setStep('arrive')
  }

  /** 마무리 화면으로 넘어가면서 기록을 남깁니다(개인정보 없음 — 쓴 글은 저장하지 않습니다). */
  const finish = (foundCount: number) => {
    if (!savedRef.current) {
      savedRef.current = true
      saveRecord({
        sessionId: sessionRef.current.id,
        startedAt: sessionRef.current.startedAt,
        durationMs: Date.now() - sessionRef.current.startedAt,
        completed: true,
        situation,
        scenarioId: scenario.id,
        flagsFound: foundCount,
        flagsTotal: scenario.redFlags.length,
        defended,
      })
    }
    setFound(foundCount)
    setStep('action')
  }

  return (
    <Stage act={ACT_OF[step]}>
      {/* 화면 전환: 새 화면이 배경 위로 부드럽게 나타납니다(빈 화면 없음) */}
      <motion.div
        key={step}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.22 }}
        className="absolute inset-0"
      >
        {step === 'intro' && (
          <IntroScreen
            onStart={() => {
              // 전체화면 시도 (태블릿에서 주소창 숨김 — 실패해도 체험은 그대로 진행됩니다)
              document.documentElement.requestFullscreen?.().catch(() => {})
              setStep('menu')
            }}
          />
        )}

        {step === 'menu' && <MenuScreen onPick={start} />}

        {/* 취업·채용 — 포렌식 수사(피해자 휴대폰 조사 → 증거 보드 → 검거 카드) */}
        {step === 'arrive' && situation === 'job' && (
          <ForensicScreen
            onReply={(delta, item) => {
              setSafety((v) => Math.max(0, Math.min(100, v + delta)))
              if (item) setGave((prev) => (prev.includes(item) ? prev : [...prev, item]))
            }}
            onSolved={finish}
          />
        )}

        {step === 'arrive' && scenario.channel === 'mail' && (
          <MailScreen
            scenario={scenario}
            onReply={(delta, item) => {
              setSafety((v) => Math.max(0, Math.min(100, v + delta)))
              if (item) setGave((prev) => (prev.includes(item) ? prev : [...prev, item]))
            }}
            onSolved={finish}
          />
        )}

        {step === 'arrive' && scenario.channel !== 'mail' && situation !== 'job' && (
          <ArriveScreen
            scenario={scenario}
            onOpen={() => setStep('chat')}
            onDecline={() => {
              setHungUp(true)
              setStep('caught')
            }}
          />
        )}

        {step === 'chat' && (
          <ChatScreen
            scenario={scenario}
            safety={safety}
            onReply={(delta, item) => {
              setSafety((v) => Math.max(0, Math.min(100, v + delta)))
              if (item) setGave((prev) => (prev.includes(item) ? prev : [...prev, item]))
            }}
            onFinish={() => setStep('caught')}
            onHangUp={() => {
              setHungUp(true)
              setStep('caught')
            }}
          />
        )}

        {step === 'caught' && (
          <CaughtScreen
            defended={defended}
            hungUp={hungUp}
            gave={gave}
            onNext={() => setStep('find')}
          />
        )}

        {step === 'find' && (
          <FindScreen scenario={scenario} defended={defended} onDone={finish} />
        )}

        {step === 'action' && (
          <ActionScreen
            found={found}
            total={scenario.redFlags.length}
            safety={safety}
            onReset={reset}
          />
        )}

        {step === 'admin' && <AdminScreen onExit={reset} />}
      </motion.div>

      {/* 운영자 화면 숨김 진입 — 우측 상단 구석 5회 탭 */}
      {step !== 'admin' && <AdminTapZone onEnter={() => setStep('admin')} />}

      {/* 60초 무입력 자동 리셋 */}
      {idleRemaining !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-night/90 px-8 text-center backdrop-blur-sm"
        >
          <p className="font-display text-[1.9rem] font-bold text-white">{ui.idle.title}</p>
          <p className="text-[1.2rem] text-white/70 tabular-nums">
            {fill(ui.idle.countdown, { n: idleRemaining })}
          </p>
          <div className="mt-2 w-full max-w-[24rem]">
            <TapButton onClick={() => {}}>{ui.idle.continue}</TapButton>
          </div>
        </motion.div>
      )}
    </Stage>
  )
}

/** 관람객이 우연히 들어가지 않도록, 보이지 않는 구석 버튼을 5회 연속 탭해야 열립니다. */
function AdminTapZone({ onEnter }: { onEnter: () => void }) {
  const taps = useRef<number[]>([])
  return (
    <button
      type="button"
      aria-hidden
      className="absolute top-0 right-0 z-40 h-16 w-16 opacity-0"
      onClick={() => {
        const now = Date.now()
        taps.current = [...taps.current, now].filter((t) => now - t < 2500)
        if (taps.current.length >= 5) {
          taps.current = []
          onEnter()
        }
      }}
    />
  )
}
