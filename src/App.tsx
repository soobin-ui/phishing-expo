import { useCallback, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Stage } from './components/Stage'
import { TapButton } from './components/Buttons'
import { MenuScreen } from './screens/MenuScreen'
import { AgeScreen } from './screens/AgeScreen'
import { ChatScreen } from './screens/ChatScreen'
import { CaughtScreen } from './screens/CaughtScreen'
import { RedFlagScreen } from './screens/RedFlagScreen'
import { QuizFindScreen } from './screens/QuizFindScreen'
import { ResultScreen } from './screens/ResultScreen'
import { AdminScreen } from './screens/AdminScreen'
import { fill, quizzes, scenarioFor, ui } from './lib/content'
import { useIdleTimer } from './lib/useIdleTimer'
import { newSessionId, saveRecord, todayRecords } from './lib/stats'
import type { Act, Step, Track } from './types'

/** 화면마다 배경 색감이 바뀝니다. 밝게 시작해서 어두워집니다. */
const ACT_OF: Record<Step, Act> = {
  menu: 'bright',
  age: 'bright',
  chat: 'dark',
  caught: 'dark',
  redflag: 'counter',
  quiz: 'counter',
  result: 'counter',
  admin: 'dark',
}

export default function App() {
  const [step, setStep] = useState<Step>('menu')
  const [track, setTrack] = useState<Track>('chat')
  const [ageGroup, setAgeGroup] = useState('')
  const [safety, setSafety] = useState(100)
  const [quizIndex, setQuizIndex] = useState(0)
  const [found, setFound] = useState(0)
  const [todayCount, setTodayCount] = useState(() => todayRecords().length)

  const sessionRef = useRef({ id: newSessionId(), startedAt: Date.now() })
  const savedRef = useRef(false)

  const scenario = useMemo(() => scenarioFor(ageGroup), [ageGroup])

  /** 찾아야 할 개수 — 시나리오는 3개, 퀴즈는 문제 수 × 3개 */
  const flagsTotal =
    track === 'chat'
      ? scenario.redFlags.length
      : quizzes.reduce((sum, q) => sum + q.redFlags.length, 0)

  const reset = useCallback(() => {
    sessionRef.current = { id: newSessionId(), startedAt: Date.now() }
    savedRef.current = false
    setTrack('chat')
    setAgeGroup('')
    setSafety(100)
    setQuizIndex(0)
    setFound(0)
    setTodayCount(todayRecords().length)
    setStep('menu')
  }, [])

  const idleRemaining = useIdleTimer({
    enabled: step !== 'menu' && step !== 'admin' && step !== 'result',
    onReset: reset,
  })

  const pickTrack = (picked: Track) => {
    // 전체화면 시도 (태블릿에서 주소창 숨김 — 실패해도 체험은 그대로 진행됩니다)
    document.documentElement.requestFullscreen?.().catch(() => {})
    sessionRef.current = { id: newSessionId(), startedAt: Date.now() }
    setTrack(picked)
    setStep(picked === 'chat' ? 'age' : 'quiz')
  }

  /** 마무리 화면으로 넘어가면서 기록을 남깁니다(개인정보 없음). */
  const finish = (foundCount: number, total: number) => {
    if (!savedRef.current) {
      savedRef.current = true
      saveRecord({
        sessionId: sessionRef.current.id,
        startedAt: sessionRef.current.startedAt,
        durationMs: Date.now() - sessionRef.current.startedAt,
        completed: true,
        track,
        ageGroup,
        scenarioId: track === 'chat' ? scenario.id : 'quiz',
        flagsFound: foundCount,
        flagsTotal: total,
        defended: safety >= 60,
      })
    }
    setFound(foundCount)
    setStep('result')
  }

  return (
    <Stage act={ACT_OF[step]}>
      {/* 화면 전환: 새 화면이 배경 위로 부드럽게 나타납니다(빈 화면 없음) */}
      <motion.div
        key={step + (step === 'quiz' ? quizIndex : '')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.22 }}
        className="absolute inset-0"
      >
        {step === 'menu' && <MenuScreen onPick={pickTrack} todayCount={todayCount} />}

        {step === 'age' && (
          <AgeScreen
            onPick={(id) => {
              setAgeGroup(id)
              setStep('chat')
            }}
            onBack={reset}
          />
        )}

        {step === 'chat' && (
          <ChatScreen
            scenario={scenario}
            safety={safety}
            onChoice={(delta) => setSafety((v) => Math.max(0, Math.min(100, v + delta)))}
            onFinish={() => setStep('caught')}
          />
        )}

        {step === 'caught' && <CaughtScreen onNext={() => setStep('redflag')} />}

        {step === 'redflag' && (
          <RedFlagScreen
            scenario={scenario}
            safety={safety}
            onFound={() => setSafety((v) => Math.min(100, v + 15))}
            onNext={(count) => finish(count, scenario.redFlags.length)}
          />
        )}

        {step === 'quiz' && (
          <QuizFindScreen
            quiz={quizzes[quizIndex]}
            index={quizIndex}
            total={quizzes.length}
            onDone={(count) => {
              const sum = found + count
              if (quizIndex + 1 < quizzes.length) {
                setFound(sum)
                setQuizIndex(quizIndex + 1)
              } else {
                finish(sum, flagsTotal)
              }
            }}
          />
        )}

        {step === 'result' && (
          <ResultScreen track={track} found={found} total={flagsTotal} onReset={reset} />
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
          className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-black/85 px-8 text-center"
        >
          <p className="text-[34px] font-extrabold text-white">{ui.idle.title}</p>
          <p className="text-[24px] text-white/70 tabular-nums">
            {fill(ui.idle.countdown, { n: idleRemaining })}
          </p>
          <div className="w-full max-w-[420px]">
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
      className="absolute top-0 right-0 z-40 h-20 w-20 opacity-0"
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
