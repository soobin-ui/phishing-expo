import { useEffect, useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { DefenseCard } from '../components/DefenseCard'
import { fill, ui } from '../lib/content'
import vip from '../content/vip.json'
import type { RedFlag, Scenario } from '../types'

/**
 * [4번 기관·기업 사칭] 가짜 통신사 'KTT' VIP 초청 사이트.
 *
 *   사건 브리핑(1번과 같은 상자) → 통신사 홈페이지 + VIP INVITATION 팝업
 *   → ① VIP 본인확인(주민번호 전체 요구) → ② 초청석 확보(상단 타이머 · 남은 좌석 3석 · 자동 배정 압박)
 *   → ③ 예약 보증금 5만원 결제(카드 정보 전부) → 초청 완료 빵빠레
 *   → 해외 결제 · 새 기기 로그인 알림이 쏟아짐 → 진실 → 검거 카드(1번과 같은 카드)
 *
 * ★ 수사 방식은 1번과 같습니다 — 제한 시간 2분 · 돋보기 6개 · 수상한 곳 4개.
 *   수상한 곳: 주소창(fake_domain) · 주민번호 전체 요구(overask) · 타이머/자동 배정 압박(pressure) · 환급형 보증금(deposit)
 * ★ 4개를 결제 전에 다 찾아도 '만약 결제했다면?'으로 결말(알림 폭탄)은 누구나 봅니다 — 그 장면이 이 사건의 교훈입니다.
 * ★ 입력칸은 누르면 체험용 가상 정보가 자동으로 채워집니다. 관람객이 실제 주민번호·카드번호를 치는 일은 없습니다.
 *   (아무것도 저장·전송하지 않습니다)
 * ★ KTT · 스페셜 T · LUMINA 는 지어낸 이름입니다. 실존 통신사·연예인 이름을 넣지 마세요.
 * ★ 이모지 금지 — 아이콘·빵빠레 모두 SVG/도형.
 */
type Stage = 'home' | 'verify' | 'seat' | 'pay' | 'done'

/** 돋보기 개수 · 제한 시간 — 1번(연구실 메일)과 같습니다 */
const TOOLS = 6
const TIME_LIMIT = 120
/** 가짜 사이트가 띄우는 마감 타이머(초) — 압박용 연출 */
const SITE_LIMIT = 180

/** 그 수상한 곳을 볼 수 있는 단계 — 힌트가 '이 화면에는 없음'을 알려줄 때 씁니다 */
const WHERE: Record<string, Stage[]> = {
  fake_domain: ['home', 'verify', 'seat', 'pay'],
  pressure: ['verify', 'seat', 'pay'],
  overask: ['verify'],
  deposit: ['pay'],
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function VipScreen({
  scenario,
  name,
  onReply,
  onSolved,
}: {
  scenario: Scenario
  name: string
  /** 놓친 곳만큼 안전도를 깎습니다(마지막 등급에 반영) — 1번과 같은 규칙 */
  onReply: (delta: number, gave: string | null) => void
  onSolved: (foundCount: number) => void
}) {
  const h = vip.hud
  const who = name.trim() || ui.name.fallback
  const flags = scenario.redFlags
  const total = flags.length

  const [rules, setRules] = useState(true)
  const [stage, setStage] = useState<Stage>('home')
  const [started, setStarted] = useState(false)
  const [solved, setSolved] = useState<string[]>([])
  const [used, setUsed] = useState(0)
  const [misses, setMisses] = useState(0)
  const [toast, setToast] = useState('')
  const [shake, setShake] = useState(false)
  const [foundPop, setFoundPop] = useState<RedFlag | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [allBox, setAllBox] = useState(false)
  /** 결제 전에 다 찾아서 '만약 결제했다면?'으로 결말을 보는 중 */
  const [sim, setSim] = useState(false)
  const [alerts, setAlerts] = useState(0)
  const [reveal, setReveal] = useState(false)
  const [card, setCard] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT)
  const [siteLeft, setSiteLeft] = useState(SITE_LIMIT)
  const done = useRef(false)
  const solvedRef = useRef<string[]>([])
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))

  const left = TOOLS - used
  const low = timeLeft <= 60
  const running = started && !card && !foundPop && !timedOut && !allBox && stage !== 'done'

  const showToast = (msg: string, ms = 1800) => {
    setToast(msg)
    later(() => setToast(''), ms)
  }

  /** 검거 카드로 — 한 번만. 놓친 곳만큼 안전도를 깎습니다 */
  const toCard = () => {
    if (done.current) return
    done.current = true
    onReply(-15 * (total - solvedRef.current.length), null)
    setCard(true)
  }

  /* 수사 제한 시간 */
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setTimeLeft((v) => Math.max(0, v - 1)), 1000)
    return () => window.clearInterval(id)
  }, [running])
  useEffect(() => {
    if (timeLeft > 0 || !started || done.current) return
    setTimedOut(true)
    showToast(h.timeoutToast, 1400)
    later(toCard, 1200)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, started])

  /* 가짜 사이트의 마감 타이머 — 본인확인 단계부터 흐릅니다(연출) */
  const siteRunning = stage !== 'home' && stage !== 'done' && !card
  useEffect(() => {
    if (!siteRunning) return
    const id = window.setInterval(() => setSiteLeft((v) => Math.max(11, v - 1)), 1000)
    return () => window.clearInterval(id)
  }, [siteRunning])
  const seats = siteLeft > SITE_LIMIT - 25 ? 3 : 2

  const locked = () => !!foundPop || card || timedOut || allBox || stage === 'done' || done.current

  /** 수상한 곳을 눌렀을 때 */
  const inspect = (target: string) => (e: MouseEvent) => {
    e.stopPropagation()
    if (locked() || solvedRef.current.includes(target)) return
    const flag = flags.find((f) => f.target === target)
    if (!flag) return
    solvedRef.current = [...solvedRef.current, target]
    setSolved(solvedRef.current)
    setUsed((v) => v + 1)
    if (hint === target) setHint(null)
    setFoundPop(flag)
  }

  /** 수상하지 않은 곳을 눌렀을 때 — 돋보기 1개 */
  const missTap = (e: MouseEvent) => {
    e.stopPropagation()
    if (locked() || !started) return
    const next = used + 1
    setUsed(next)
    setMisses((v) => v + 1)
    setShake(true)
    later(() => setShake(false), 500)
    if (TOOLS - next <= 0) {
      showToast(h.miss, 1200)
      later(toCard, 1000)
    } else showToast(TOOLS - next === 1 ? h.lastOne : h.miss)
  }

  const closeFound = () => {
    setFoundPop(null)
    if (solvedRef.current.length >= total) setAllBox(true)
    else if (TOOLS - used <= 0) later(toCard, 400)
  }

  const showHint = () => {
    if (locked() || !started) return
    const next = flags.find((f) => !solved.includes(f.target) && WHERE[f.target]?.includes(stage))
    if (!next) return showToast(h.hintNone, 2600)
    setHint(next.target)
    showToast(h.hintToast, 2200)
  }

  /** 결말 — 초청 완료 빵빠레 → 알림 폭탄 → 진실 */
  const finale = (simulated: boolean) => {
    setSim(simulated)
    setAllBox(false)
    setStage('done')
    const n = vip.flood.alerts.length
    for (let i = 0; i < n; i += 1) later(() => setAlerts(i + 1), 1700 + i * 360)
    later(() => setReveal(true), 1700 + n * 360 + 1400)
  }

  /** 수상한 곳 — 찾기 전에는 티가 나지 않고, 찾으면 붉게, 힌트면 노랗게 빛납니다 */
  const spot = (target: string, children: ReactNode, className = '') => (
    <span
      data-spot={target}
      onClick={inspect(target)}
      className={`cursor-pointer rounded ${className} ${
        solved.includes(target)
          ? 'bg-red-100 font-bold text-red-700 underline decoration-red-400 decoration-2'
          : hint === target
            ? 'hint-glow'
            : ''
      }`}
    >
      {children}
    </span>
  )
  /** 평범한 글 — 누르면 돋보기 1개 */
  const plain = (children: ReactNode, className = '') => (
    <span onClick={missTap} className={className}>
      {children}
    </span>
  )

  const step2 = started
  return (
    <div className="relative h-full w-full">
      <div
        aria-hidden={rules}
        className={`flex h-full w-full flex-col transition-[filter] duration-500 ${
          rules ? 'pointer-events-none blur-[6px] select-none' : ''
        }`}
      >
        {/* 머리글 — 1번과 같은 모양: STEP · 지금 할 일 · 숫자 상자 */}
        <header className={`shrink-0 px-4 pt-[max(0.7rem,1.4vh)] pb-2.5 text-center ${card ? 'hidden' : ''}`}>
          <div className="mx-auto w-full max-w-[78rem]">
            <p
              key={`step-${step2}`}
              className="headline-pop inline-block rounded-full bg-gold px-3 py-1 font-display text-[0.85rem] leading-none font-bold tracking-[0.16em] text-navy-deep tabular-nums"
            >
              {fill(h.step, { n: step2 ? 2 : 1 })}
            </p>
            <h2
              key={String(step2)}
              className="headline-pop headline-glow mt-1.5 origin-center font-display text-[clamp(1.75rem,6.6vw,3rem)] leading-tight font-bold text-white"
            >
              <Strong text={step2 ? fill(h.goal, { n: total }) : h.openGoal} pulse={step2} />
            </h2>
            <p className="mt-1 text-[1.05rem] leading-snug text-white/70">{step2 ? h.goalSub : h.openSub}</p>
            <div className="mt-2.5 flex items-stretch justify-center gap-2 wide:hidden">{renderStats(false)}</div>
          </div>
        </header>

        <div className="mx-auto flex min-h-0 w-full max-w-[78rem] flex-1 wide:gap-4 wide:px-4 wide:pb-4">
          {/* 가짜 사이트 — 브라우저 창 */}
          <motion.section
            animate={shake ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.4 }}
            data-role="vip-site"
            className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-t-2xl bg-[#f4f5f8] text-[#1c1f2a] shadow-[0_0.6rem_2rem_rgba(0,0,0,0.35)] wide:rounded-2xl"
          >
            {/* 브라우저 윗줄 — 주소가 첫 번째 수상한 곳 */}
            <div className="flex shrink-0 items-center gap-2.5 border-b border-[#e3e6ee] bg-white px-3 py-2">
              <span className="flex gap-1.5" aria-hidden="true">
                <i className="block h-[0.6rem] w-[0.6rem] rounded-full bg-[#ff6159]" />
                <i className="block h-[0.6rem] w-[0.6rem] rounded-full bg-[#ffbd2e]" />
                <i className="block h-[0.6rem] w-[0.6rem] rounded-full bg-[#28c941]" />
              </span>
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-[#eef0f5] px-3.5 py-1.5 text-[0.98rem] text-[#4a5368]">
                <LockIcon />
                {spot('fake_domain', vip.site.address, 'truncate px-1')}
              </div>
            </div>

            {/* 가짜 마감 타이머 — 본인확인부터 화면 상단에 계속 */}
            {stage !== 'home' && stage !== 'done' && (
              <div
                data-spot="pressure"
                onClick={inspect('pressure')}
                className={`flex shrink-0 cursor-pointer items-center justify-center gap-3 px-3 py-2 text-[1rem] font-bold text-white ${
                  solved.includes('pressure')
                    ? 'bg-[#7a1020] underline decoration-red-300 decoration-2'
                    : hint === 'pressure'
                      ? 'hint-glow bg-[#d4143a]'
                      : 'bg-[#d4143a]'
                }`}
              >
                <ClockIcon />
                <span>{vip.site.bar.label}</span>
                <b className={`font-display text-[1.25rem] tabular-nums ${siteLeft <= 60 ? 'timer-shake' : ''}`}>{mmss(siteLeft)}</b>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[0.9rem]">{fill(vip.site.bar.seats, { n: seats })}</span>
              </div>
            )}

            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <SiteHeader />
              {stage === 'home' && <Home plain={plain} />}
              {stage === 'verify' && (
                <Verify who={who} spot={spot} plain={plain} onNext={() => setStage('seat')} />
              )}
              {stage === 'seat' && (
                <Seat who={who} seats={seats} spot={spot} plain={plain} onNext={() => setStage('pay')} />
              )}
              {stage === 'pay' && <Pay spot={spot} onPay={() => finale(false)} />}
              {stage === 'done' && <Done who={who} />}
            </div>

            {/* VIP INVITATION 팝업 — 홈페이지 광고처럼 */}
            <AnimatePresence>
              {stage === 'home' && !rules && (
                <Invitation
                  who={who}
                  plain={plain}
                  onOpen={() => {
                    setStarted(true)
                    setStage('verify')
                  }}
                />
              )}
            </AnimatePresence>

            {/* 해외 결제 · 새 기기 로그인 알림이 쏟아집니다 */}
            {stage === 'done' && alerts > 0 && <Flood count={alerts} />}

            {/* 수상한 곳을 찾았을 때 */}
            <AnimatePresence>
              {foundPop && <FoundBubble flag={foundPop} index={solved.indexOf(foundPop.target) + 1} total={total} onOk={closeFound} />}
            </AnimatePresence>

            {/* 결제 전에 다 찾음 → '만약 결제했다면?' */}
            <AnimatePresence>
              {allBox && (
                <Overlay>
                  <p className="font-display text-[min(1.5rem,5.8vw)] leading-snug font-bold text-gold [text-shadow:0_0_1rem_rgba(254,202,54,0.5)]">
                    {fill(vip.allFound.title, { n: total })}
                  </p>
                  <p className="mt-2 text-[1.05rem] leading-snug text-white/80">{vip.allFound.body}</p>
                  <GoldButton role="vip-sim" onClick={() => finale(true)}>
                    {vip.allFound.cta}
                  </GoldButton>
                </Overlay>
              )}
            </AnimatePresence>

            {/* 진실 */}
            <AnimatePresence>
              {reveal && !card && (
                <Overlay red>
                  <span className="inline-block rounded-md bg-[#ff5a5a] px-2.5 py-1 font-display text-[0.85rem] leading-none font-bold text-white">
                    {vip.flood.revealTag}
                  </span>
                  <p className="mt-3 font-display text-[min(1.55rem,6vw)] leading-snug font-bold text-white">{vip.flood.revealTitle}</p>
                  <p className="mt-2 text-[1.02rem] leading-snug text-white/80">{vip.flood.revealBody}</p>
                  {sim && <p className="mt-2 text-[0.95rem] leading-snug text-[#9fe0ff]">{vip.flood.revealSim}</p>}
                  <GoldButton role="vip-reveal-next" onClick={toCard}>
                    {vip.flood.cta}
                  </GoldButton>
                </Overlay>
              )}
            </AnimatePresence>

            {toast && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute inset-x-4 bottom-4 z-30 rounded-xl bg-[#1f2430] px-4 py-3 text-center text-[0.95rem] text-white shadow-lg"
              >
                {toast}
              </motion.p>
            )}
          </motion.section>

          {/* 가로 화면: 숫자 상자를 사이트 오른쪽에 크게 */}
          <aside className={`w-[15.5rem] shrink-0 flex-col gap-3 ${card ? 'hidden' : 'hidden wide:flex'}`}>{renderStats(true)}</aside>
        </div>
      </div>

      <AnimatePresence>
        {card && (
          <DefenseCard
            stats={{
              found: solved.length,
              total,
              wrongs: 0,
              misses,
              blocked: (solved.includes('fake_domain') ? 1 : 0) + (solved.includes('deposit') ? 1 : 0),
            }}
            flags={flags}
            solved={solved}
            copy={{
              ...vip.card,
              failBody: timedOut ? vip.card.timeoutBody : left <= 0 ? vip.card.failBody : vip.card.paidBody,
            }}
            review={(flag) => <ReviewSite flag={flag} who={who} />}
            onNext={() => onSolved(solved.length)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>{rules && <Rules total={total} onStart={() => setRules(false)} />}</AnimatePresence>
    </div>
  )

  /** 남은 시간 · 찾은 곳 · 남은 기회 (+ 힌트) — 1번과 같은 색 상자 */
  function renderStats(big: boolean) {
    const urgent = low && started
    // 가로 화면 오른쪽 세로 칸은 힌트 버튼까지 4칸이라, 1번(3칸)보다 조금 작게 잡아 노트북 높이에 다 들어오게
    const digits = big ? 'text-[3.4rem]' : 'text-[2.3rem]'
    const small = big ? 'text-[1.4rem]' : 'text-[1.2rem]'
    return (
      <>
        <Stat label={h.time} tone="time" low={urgent} big={big}>
          <b
            data-role="timer"
            className={`mt-0.5 font-display ${digits} leading-none font-bold tabular-nums ${urgent ? 'timer-shake text-[#ff8080]' : 'text-white'}`}
          >
            {mmss(timeLeft)}
          </b>
          <span className={`w-full overflow-hidden rounded-full bg-white/12 ${big ? 'mt-3 h-[0.45rem]' : 'mt-1.5 h-[0.3rem]'}`}>
            <span
              className={`block h-full rounded-full transition-[width] duration-1000 ease-linear ${urgent ? 'bg-[#ff8080]' : 'bg-gold'}`}
              style={{ width: `${(timeLeft / TIME_LIMIT) * 100}%` }}
            />
          </span>
        </Stat>

        <Stat label={h.progressLabel} tone="found" big={big}>
          <motion.b
            key={solved.length}
            initial={{ scale: solved.length ? 1.6 : 1 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 12 }}
            data-role="found-count"
            className={`mt-0.5 font-display ${digits} leading-none font-bold text-gold tabular-nums`}
          >
            {solved.length}
            <span className={`${small} font-bold text-white/50`}> / {total}</span>
          </motion.b>
          <span className={`flex ${big ? 'mt-3 gap-1.5' : 'mt-2 gap-1'}`} aria-hidden="true">
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={`rounded-full ${big ? 'h-[0.85rem] w-[0.85rem]' : 'h-[0.55rem] w-[0.55rem]'} ${i < solved.length ? 'bg-gold' : 'bg-white/20'}`}
              />
            ))}
          </span>
        </Stat>

        <Stat label={h.chances} tone="chance" big={big}>
          <motion.b
            key={left}
            initial={{ scale: left < TOOLS ? 1.6 : 1 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 12 }}
            className={`mt-0.5 font-display ${digits} leading-none font-bold tabular-nums ${left <= 1 ? 'text-[#ff8080]' : 'text-white'}`}
          >
            {Math.max(0, left)}
            <span className={`${small} font-bold text-white/50`}> / {TOOLS}</span>
          </motion.b>
          <span className={`flex ${big ? 'mt-3 gap-1' : 'mt-1.5 gap-[0.15rem]'}`} aria-label={fill(h.left, { n: Math.max(0, left) })}>
            {Array.from({ length: TOOLS }, (_, i) => (
              <Magnifier key={i} className={`${big ? 'h-[1.5rem] w-[1.5rem]' : 'h-[1.05rem] w-[1.05rem]'} ${i < left ? 'text-gold' : 'text-white/15'}`} />
            ))}
          </span>
        </Stat>

        <button
          type="button"
          data-role="vip-hint"
          onClick={showHint}
          disabled={!started}
          className={`shrink-0 rounded-2xl border-2 border-[#ffe14d]/80 bg-[#3d3306]/90 font-display font-bold text-[#ffe14d] shadow-[0_0_1rem_rgba(255,225,77,0.3)] active:bg-[#574a0a] disabled:opacity-40 ${
            big ? 'min-h-[3rem] w-full py-2 text-[1.25rem]' : 'px-3.5 text-[1.05rem]'
          }`}
        >
          {h.hint}
        </button>
      </>
    )
  }
}

type SpotFn = (target: string, children: ReactNode, className?: string) => ReactNode
type PlainFn = (children: ReactNode, className?: string) => ReactNode

/* ─────────────── 가짜 사이트 ─────────────── */

/** 통신사 홈페이지 머리 — 유틸바 + 로고 + GNB 메뉴 (실제 통신사 홈페이지 구조) */
function SiteHeader() {
  const s = vip.site
  return (
    <div className="shrink-0 bg-white">
      {/* 상단 유틸바 — 얇은 회색 줄 */}
      <div className="border-b border-[#eef0f4] bg-[#fafbfc]">
        <div className="mx-auto flex max-w-[64rem] items-center justify-end gap-3.5 px-4 py-1.5 text-[0.78rem] text-[#8a93a6]" aria-hidden="true">
          {s.utility.map((u, i) => (
            <span key={u} className="flex items-center gap-3.5">
              {i > 0 && <span className="text-[#dfe3ea]">|</span>}
              <span>{u}</span>
            </span>
          ))}
        </div>
      </div>
      {/* 로고 + GNB */}
      <div className="mx-auto flex max-w-[64rem] items-center gap-5 px-4 py-3">
        <span className="flex items-baseline gap-1">
          <b className="font-display text-[1.7rem] leading-none font-black tracking-tight text-[#e01a3c]">{s.brand}</b>
        </span>
        <nav className="ml-1 hidden flex-1 items-center gap-5 text-[0.98rem] font-bold text-[#2a3040] wide:flex" aria-hidden="true">
          {s.menu.map((m) => (
            <span key={m} className={`relative py-1 ${m === s.menuActive ? 'text-[#e01a3c]' : ''}`}>
              {m}
              {m === s.menuActive && <span className="absolute inset-x-0 -bottom-[0.85rem] h-[0.18rem] rounded-full bg-[#e01a3c]" />}
            </span>
          ))}
        </nav>
        {/* 좁은 화면: 현재 메뉴만 + 햄버거 */}
        <span className="ml-auto flex items-center gap-3 wide:hidden" aria-hidden="true">
          <span className="text-[0.95rem] font-bold text-[#e01a3c]">{s.menuActive}</span>
          <svg viewBox="0 0 24 24" className="h-[1.4rem] w-[1.4rem] text-[#2a3040]" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        </span>
      </div>
    </div>
  )
}

/** 홈페이지 본문 — 히어로 배너 + 멤버십 혜택 + 자주 찾는 서비스 + 푸터 (팝업 뒤에 깔립니다) */
function Home({ plain }: { plain: PlainFn }) {
  const s = vip.site
  return (
    <div className="bg-[#f4f5f8] pb-6">
      {/* 히어로 프로모션 배너 */}
      <div className="mx-auto max-w-[64rem] px-4 pt-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a0710] via-[#7a1230] to-[#e01a3c] px-6 py-7 text-white">
          <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-14 right-16 h-32 w-32 rounded-full bg-white/10" aria-hidden="true" />
          <p className="font-display text-[0.82rem] font-bold tracking-[0.28em] text-[#ffc9d4]">{s.heroEyebrow}</p>
          <span className="mt-2 inline-block rounded-full bg-white/15 px-3 py-1 text-[0.82rem] font-bold text-white">{s.heroTag}</span>
          <p className="mt-2.5 font-display text-[2rem] leading-tight font-black">{s.heroTitle}</p>
          <p className="mt-2 text-[0.98rem] leading-snug whitespace-pre-line text-white/85">{plain(s.heroBody)}</p>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[0.95rem] font-bold text-[#e01a3c]">
            {s.heroCta}
            <svg viewBox="0 0 24 24" className="h-[1rem] w-[1rem]" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="absolute bottom-4 right-5 rounded-full bg-black/25 px-2.5 py-0.5 text-[0.78rem] tabular-nums text-white/80" aria-hidden="true">{s.heroPager}</span>
        </div>
      </div>

      {/* 멤버십 혜택 */}
      <div className="mx-auto max-w-[64rem] px-4 pt-5">
        <h3 className="font-display text-[1.2rem] font-bold text-[#1c1f2a]">{s.sectionTitle}</h3>
        <div className="mt-3 grid grid-cols-2 gap-2.5 wide:grid-cols-4">
          {s.benefits.map((b) => (
            <div key={b.title} className="rounded-2xl bg-white px-3.5 py-4 shadow-[0_0.15rem_0.7rem_rgba(20,30,60,0.06)]">
              <span className="inline-block rounded-md bg-[#fdeaee] px-2 py-0.5 font-display text-[0.68rem] font-bold tracking-[0.1em] text-[#e01a3c]">{b.tag}</span>
              <p className="mt-2 text-[1rem] font-bold text-[#1c1f2a]">{b.title}</p>
              <p className="mt-0.5 text-[0.84rem] leading-snug text-[#6b7386]">{b.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 자주 찾는 서비스 */}
      <div className="mx-auto max-w-[64rem] px-4 pt-5">
        <h3 className="font-display text-[1.2rem] font-bold text-[#1c1f2a]">{s.quickTitle}</h3>
        <div className="mt-3 grid grid-cols-3 gap-2.5 wide:grid-cols-6">
          {s.quick.map((q) => (
            <div key={q} className="flex flex-col items-center gap-2 rounded-xl bg-white px-2 py-3.5 shadow-[0_0.1rem_0.5rem_rgba(20,30,60,0.05)]">
              <span className="flex h-[2.4rem] w-[2.4rem] items-center justify-center rounded-full bg-[#fdeaee] text-[#e01a3c]">
                <svg viewBox="0 0 24 24" className="h-[1.2rem] w-[1.2rem]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="8" />
                  <path d="M12 8v8M8 12h8" strokeLinecap="round" />
                </svg>
              </span>
              <span className="text-[0.82rem] font-semibold text-[#3a4256]">{q}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 푸터 — 사업자 정보 */}
      <div className="mx-auto mt-6 max-w-[64rem] border-t border-[#e3e6ee] px-4 pt-4">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.8rem] font-semibold text-[#5a6377]" aria-hidden="true">
          {s.footer.links.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
        <p className="mt-2.5 text-[0.82rem] font-bold text-[#3a4256]">{s.footer.company}</p>
        {s.footer.lines.map((l) => (
          <p key={l} className="mt-0.5 text-[0.76rem] leading-snug text-[#9aa1ad]">{l}</p>
        ))}
        <p className="mt-2 text-[0.76rem] text-[#b7bdc8]">{s.footer.copyright}</p>
      </div>
    </div>
  )
}

/** VIP INVITATION — 검정·금색 초청장 팝업 */
function Invitation({ who, plain, onOpen }: { who: string; plain: PlainFn; onOpen: () => void }) {
  const p = vip.popup
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 px-5 py-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.5 }}
        role="dialog"
        data-role="vip-popup"
        className="no-scrollbar max-h-full w-full max-w-[25rem] overflow-y-auto rounded-2xl border border-[#d8b35a] bg-gradient-to-b from-[#16120a] to-[#0a0806] px-5 py-6 text-center text-white shadow-[0_0_2.4rem_rgba(216,179,90,0.45)]"
      >
        <p className="font-display text-[0.95rem] font-bold tracking-[0.42em] text-[#e6c77a]">{p.eyebrow}</p>
        <div className="mx-auto mt-2 h-px w-[60%] bg-gradient-to-r from-transparent via-[#d8b35a] to-transparent" />
        <p className="mt-4 font-display text-[1.35rem] leading-snug font-bold">{fill(p.hello, { name: who })}</p>
        <p className="mt-1.5 text-[1rem] leading-snug text-white/80">{plain(p.selected)}</p>

        {/* 콘서트 티켓 */}
        <div className="relative mt-4 overflow-hidden rounded-xl border border-dashed border-[#d8b35a]/70 bg-[linear-gradient(135deg,#2a1f08,#4a3510_55%,#2a1f08)] px-4 py-4">
          <p className="text-[0.8rem] font-bold tracking-[0.3em] text-[#e6c77a]">{p.ticketTour}</p>
          <p className="mt-0.5 font-display text-[1.5rem] leading-tight font-bold text-white">{p.ticketTitle}</p>
          <p className="mt-2 inline-block rounded-full bg-[#e6c77a] px-3 py-1 font-display text-[1.05rem] font-bold text-[#2a1f08]">{p.ticketSeat}</p>
          <p className="mt-2 text-[0.85rem] text-white/70">{p.ticketDate}</p>
        </div>

        <motion.p
          animate={{ opacity: [1, 0.45, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="mt-3 text-[0.98rem] font-bold text-[#ff8a9c]"
        >
          {p.rush}
        </motion.p>

        <button
          type="button"
          data-role="vip-open"
          onClick={onOpen}
          className="mt-3 min-h-[3.5rem] w-full rounded-xl bg-gradient-to-b from-[#f2d88e] to-[#c99a3a] px-4 font-display text-[1.2rem] font-bold text-[#2a1f08] shadow-[0_0.25rem_0_#8a6a1e] active:translate-y-[0.12rem] active:shadow-[0_0.12rem_0_#8a6a1e]"
        >
          {p.cta}
        </button>
        <p className="mt-3 text-[0.82rem] text-white/40">{p.later}</p>
      </motion.div>
    </motion.div>
  )
}

/** 단계 머리 — STEP n · 제목 */
function StageHead({ step, title }: { step: string; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="rounded-md bg-[#d4143a] px-2 py-1 font-display text-[0.8rem] leading-none font-bold tracking-[0.1em] text-white">{step}</span>
      <h3 className="font-display text-[1.45rem] leading-tight font-bold">{title}</h3>
    </div>
  )
}

type Field = { id: string; label: string; value: string; flag?: string }

/** 누르면 체험용 가상 정보가 한 글자씩 채워지는 입력칸 */
function useAutoFill(fields: Field[], who: string) {
  const [typed, setTyped] = useState<Record<string, string>>({})
  const busy = useRef<Record<string, boolean>>({})
  const ids = useRef<number[]>([])
  useEffect(() => () => ids.current.forEach((t) => window.clearInterval(t)), [])
  const valueOf = (f: Field) => fill(f.value, { name: who })
  const start = (f: Field) => {
    if (busy.current[f.id]) return
    busy.current[f.id] = true
    const full = valueOf(f)
    let n = 0
    const id = window.setInterval(() => {
      n += 1
      setTyped((prev) => ({ ...prev, [f.id]: full.slice(0, n) }))
      if (n >= full.length) window.clearInterval(id)
    }, 55)
    ids.current.push(id)
  }
  const complete = fields.every((f) => (typed[f.id] ?? '') === valueOf(f))
  return { typed, start, complete }
}

function AutoField({ field, typed, onFill, label }: { field: Field; typed: string; onFill: () => void; label: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[0.95rem] font-bold text-[#3a4256]">{label}</p>
      <button
        type="button"
        data-role={`vip-field-${field.id}`}
        onClick={onFill}
        className="flex min-h-[3.2rem] w-full items-center rounded-xl border border-[#d5d9e3] bg-white px-4 text-left text-[1.1rem] tabular-nums active:border-[#d4143a]"
      >
        {typed ? <span className="text-[#1c1f2a]">{typed}</span> : <span className="text-[#a3abb8]">{vip.site.tapToFill}</span>}
      </button>
    </div>
  )
}

function SiteButton({ role, disabled, onClick, children }: { role: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      data-role={role}
      disabled={disabled}
      onClick={onClick}
      className="mt-4 min-h-[3.5rem] w-full rounded-xl bg-[#d4143a] px-4 text-[1.15rem] font-bold text-white shadow-[0_0.2rem_0_#8f0d27] active:translate-y-[0.1rem] active:shadow-[0_0.1rem_0_#8f0d27] disabled:opacity-35"
    >
      {children}
    </button>
  )
}

/** ① VIP 본인확인 — 주민등록번호 전체를 요구합니다 */
function Verify({ who, spot, plain, onNext }: { who: string; spot: SpotFn; plain: PlainFn; onNext: () => void }) {
  const v = vip.verify
  const { typed, start, complete } = useAutoFill(v.fields, who)
  return (
    <div className="mx-auto w-full max-w-[32rem] px-5 py-5">
      <StageHead step={v.step} title={v.title} />
      <p className="mt-1.5 text-[1rem] text-[#5a6377]">{plain(v.body)}</p>
      <div className="mt-4 flex flex-col gap-3.5">
        {v.fields.map((f: Field) => (
          <AutoField
            key={f.id}
            field={f}
            typed={typed[f.id] ?? ''}
            onFill={() => start(f)}
            label={f.flag ? spot(f.flag, f.label, 'px-0.5') : f.label}
          />
        ))}
      </div>
      <p className="mt-3 text-[0.82rem] leading-snug text-[#8a93a6]">{vip.site.demoNote}</p>
      <SiteButton role="vip-verify-next" disabled={!complete} onClick={onNext}>
        {v.cta}
      </SiteButton>
    </div>
  )
}

/** ② 초청석 확보 — 남은 좌석 · 자동 배정 압박 */
function Seat({ who, seats, spot, plain, onNext }: { who: string; seats: number; spot: SpotFn; plain: PlainFn; onNext: () => void }) {
  const s = vip.seat
  return (
    <div className="mx-auto w-full max-w-[32rem] px-5 py-5">
      <StageHead step={s.step} title={s.title} />
      <p className="mt-1.5 text-[1rem] text-[#5a6377]">{plain(fill(s.body, { name: who }))}</p>

      {/* 좌석도 */}
      <div className="mt-4 rounded-2xl bg-[#12141c] px-4 py-4 text-center text-white">
        <p className="mx-auto w-[62%] rounded-b-[2rem] bg-gradient-to-b from-[#e6c77a] to-[#a67c24] py-1.5 font-display text-[0.85rem] font-bold tracking-[0.3em] text-[#2a1f08]">{s.stage}</p>
        <div className="mx-auto mt-3 grid w-fit grid-cols-8 gap-1.5" aria-hidden="true">
          {Array.from({ length: 24 }, (_, i) => {
            const mine = i === 11 || i === 12
            const open = i === 13 && seats >= 3
            return (
              <motion.i
                key={i}
                animate={mine ? { opacity: [1, 0.5, 1] } : undefined}
                transition={mine ? { duration: 1.4, repeat: Infinity } : undefined}
                className={`block h-[1.15rem] w-[1.15rem] rounded-[0.3rem] ${mine ? 'bg-[#e6c77a] shadow-[0_0_0.6rem_rgba(230,199,122,0.8)]' : open ? 'border border-[#e6c77a]/70' : 'bg-white/15'}`}
              />
            )
          })}
        </div>
        <p className="mt-3 font-display text-[1.1rem] font-bold text-[#e6c77a]">{s.zone}</p>
        <p className="mt-0.5 text-[0.95rem] font-bold text-[#ff8a9c]">{fill(vip.site.bar.seats, { n: seats })}</p>
      </div>

      <p className="mt-3.5 rounded-xl border border-[#f3c2cb] bg-[#fff1f3] px-3.5 py-3 text-[0.98rem] leading-snug text-[#5a1222]">
        {spot('pressure', s.notice)}
      </p>
      <SiteButton role="vip-seat-next" onClick={onNext}>
        {s.cta}
      </SiteButton>
    </div>
  )
}

/** ③ 예약 보증금 결제 — 환급해 준다며 카드 정보 전부를 받습니다 */
function Pay({ spot, onPay }: { spot: SpotFn; onPay: () => void }) {
  const p = vip.pay
  const { typed, start, complete } = useAutoFill(p.fields, '')
  const [paying, setPaying] = useState(false)
  const t = useRef(0)
  useEffect(() => () => window.clearTimeout(t.current), [])
  const pay = () => {
    if (!complete || paying) return
    setPaying(true)
    t.current = window.setTimeout(onPay, 1400)
  }
  return (
    <div className="mx-auto w-full max-w-[32rem] px-5 py-5">
      <StageHead step={p.step} title={p.title} />
      <p className="mt-3 rounded-xl border border-[#e3e6ee] bg-white px-3.5 py-3 text-[0.98rem] leading-snug text-[#3a4256]">{spot('deposit', p.notice)}</p>
      <div className="mt-3 flex items-center justify-between rounded-xl bg-[#12141c] px-4 py-3 text-white">
        <span className="text-[0.95rem] text-white/70">{p.amountLabel}</span>
        <b className="font-display text-[1.5rem] text-[#e6c77a]">{p.amount}</b>
      </div>
      <div className="mt-3.5 grid grid-cols-2 gap-3">
        {p.fields.map((f: Field, i: number) => (
          <div key={f.id} className={i === 0 ? 'col-span-2' : i === 3 ? 'col-span-2' : ''}>
            <AutoField field={f} typed={typed[f.id] ?? ''} onFill={() => start(f)} label={f.label} />
          </div>
        ))}
      </div>
      <p className="mt-3 text-[0.82rem] leading-snug text-[#8a93a6]">{vip.site.demoNote}</p>
      <SiteButton role="vip-pay" disabled={!complete || paying} onClick={pay}>
        {paying ? p.paying : p.cta}
      </SiteButton>
    </div>
  )
}

/** 초청 완료 — 빵빠레(색종이) */
function Done({ who }: { who: string }) {
  const d = vip.done
  const colors = ['#e6c77a', '#ff5a7a', '#5ac8ff', '#ffffff', '#9b7bff', '#5fe0a0']
  return (
    <div className="relative overflow-hidden px-5 py-7 text-center" data-role="vip-done">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {Array.from({ length: 36 }, (_, i) => (
          <motion.i
            key={i}
            initial={{ y: -30, x: 0, rotate: 0, opacity: 0 }}
            animate={{ y: 520, x: ((i * 37) % 80) - 40, rotate: 360 + i * 40, opacity: [0, 1, 1, 0] }}
            transition={{ duration: 2.2 + (i % 5) * 0.25, delay: (i % 9) * 0.12, repeat: 1, ease: 'easeIn' }}
            style={{ left: `${(i * 29) % 100}%`, background: colors[i % colors.length] }}
            className="absolute top-0 block h-[0.7rem] w-[0.42rem] rounded-[0.1rem]"
          />
        ))}
      </div>
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 14 }}>
        <span className="mx-auto flex h-[4.2rem] w-[4.2rem] items-center justify-center rounded-full bg-gradient-to-b from-[#f2d88e] to-[#c99a3a] text-[#2a1f08] shadow-[0_0_1.6rem_rgba(230,199,122,0.7)]">
          <svg viewBox="0 0 24 24" className="h-[2.3rem] w-[2.3rem]" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <p className="mt-3 font-display text-[0.9rem] font-bold tracking-[0.34em] text-[#b08a2e]">{d.eyebrow}</p>
        <p className="mt-1 font-display text-[1.65rem] leading-tight font-bold">{d.title}</p>
        <p className="mt-1.5 text-[1rem] text-[#5a6377]">{fill(d.body, { name: who })}</p>
      </motion.div>
      <dl className="mx-auto mt-4 max-w-[26rem] rounded-xl bg-white px-4 py-1 text-left shadow-[0_0.15rem_0.6rem_rgba(20,30,60,0.08)]">
        {d.rows.map((r) => (
          <div key={r.k} className="flex items-center justify-between gap-3 border-b border-[#eef0f5] py-2.5 last:border-0">
            <dt className="shrink-0 text-[0.92rem] text-[#6b7386]">{r.k}</dt>
            <dd className="text-right text-[0.98rem] font-bold tabular-nums">{r.v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/** 알림 폭탄 — 위에서부터 빠르게 쌓이고, 화면 가장자리가 붉게 물듭니다 */
function Flood({ count }: { count: number }) {
  const f = vip.flood
  const shown = f.alerts.slice(0, count)
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" data-role="vip-flood">
      <motion.div
        animate={{ opacity: [0.25, 0.6, 0.25] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 shadow-[inset_0_0_6rem_rgba(255,40,60,0.75)]"
      />
      <div className="absolute inset-x-3 top-3 mx-auto flex max-w-[30rem] flex-col gap-1.5">
        {/* 새 알림이 맨 위 — 아래로 밀려 내려갑니다 */}
        {[...shown].reverse().slice(0, 7).map((a, i) => (
          <motion.div
            layout
            key={shown.length - i}
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1 - i * 0.09, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            className="rounded-2xl bg-white/97 px-4 py-2.5 text-left text-[#1f2430] shadow-[0_0.5rem_1.6rem_rgba(0,0,0,0.35)]"
          >
            <p className="flex items-center gap-2 text-[0.8rem] font-bold text-[#e5484d]">
              <span className="block h-[0.55rem] w-[0.55rem] rounded-full bg-[#e5484d]" />
              {a.from}
              <span className="ml-auto font-normal text-[#9aa1ad]">{f.now}</span>
            </p>
            <p className="mt-0.5 text-[0.98rem] leading-snug font-semibold">{a.text}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────── 수사관 쪽 상자들 ─────────────── */

/** 가짜 사이트 위에 뜨는 어두운 수사관 상자 */
function Overlay({ children, red = false }: { children: ReactNode; red?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex items-center justify-center bg-[#050a18]/80 px-5 backdrop-blur-[3px]"
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        role="alertdialog"
        className={`w-full max-w-[28rem] rounded-2xl border px-[clamp(1.1rem,4vw,1.6rem)] py-[clamp(1.1rem,3vh,1.6rem)] text-center text-white ${
          red
            ? 'border-[#ff5a5a]/70 bg-[#2a0a10]/97 shadow-[0_0_2.4rem_rgba(255,70,70,0.4)]'
            : 'border-[#2fa8ff]/60 bg-[#0b1631]/97 shadow-[0_0_2.4rem_rgba(47,168,255,0.35)]'
        }`}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

function GoldButton({ role, onClick, children }: { role: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      data-role={role}
      onClick={onClick}
      className="mt-4 min-h-[3.5rem] w-full rounded-xl bg-gold px-4 font-display text-[1.2rem] font-bold text-navy-deep shadow-[0_0.3rem_0_var(--color-gold-deep)] active:translate-y-[0.15rem] active:shadow-[0_0.15rem_0_var(--color-gold-deep)]"
    >
      {children}
    </button>
  )
}

/** 수상한 곳을 찾았을 때 — 무엇이 왜 수상한지 바로 알려줍니다 */
function FoundBubble({ flag, index, total, onOk }: { flag: RedFlag; index: number; total: number; onOk: () => void }) {
  return (
    <Overlay>
      <span className="inline-flex items-center gap-1.5 rounded-md bg-gold px-2.5 py-1 font-display text-[0.85rem] leading-none font-bold text-navy-deep">
        <Magnifier className="h-[0.95rem] w-[0.95rem]" />
        {vip.hud.foundTag} {index} / {total}
      </span>
      <p className="mt-3 font-display text-[min(1.4rem,5.6vw)] leading-snug font-bold text-gold">{flag.label}</p>
      <p className="mt-2 text-left text-[1.02rem] leading-snug text-white/85">{flag.explain}</p>
      <GoldButton role="vip-found-ok" onClick={onOk}>
        {vip.hud.foundOk}
      </GoldButton>
    </Overlay>
  )
}

/** 사건 브리핑 — 1번(연구실 메일)과 같은 상자 */
function Rules({ total, onStart }: { total: number; onStart: () => void }) {
  const r = vip.rules
  const icons = [<GlobeIcon key="g" />, <TargetIcon key="t" />, <Magnifier key="m" className="h-[1.25rem] w-[1.25rem]" />]
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-[#050a18]/55 px-5"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vip-rules-title"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        className="w-full max-w-[30rem] rounded-2xl border border-[#2fa8ff]/60 bg-[#0b1631]/95 px-[clamp(1.2rem,4vw,1.8rem)] py-[clamp(1.2rem,3vh,1.8rem)] text-center text-white shadow-[0_0_2.4rem_rgba(47,168,255,0.35),inset_0_0_1.6rem_rgba(47,168,255,0.08)]"
      >
        <span className="inline-flex items-center gap-1.5 rounded-md bg-gold px-2.5 py-1 font-display text-[0.85rem] leading-none font-bold text-navy-deep">
          <GlobeIcon className="h-[0.95rem] w-[0.95rem]" />
          {r.tag}
        </span>
        <h2 id="vip-rules-title" className="mt-3 font-display text-[min(1.6rem,6vw)] leading-snug font-bold whitespace-pre-line [text-shadow:0_0_1rem_rgba(47,168,255,0.6)]">
          {r.title}
        </h2>
        <ol className="mt-5 flex flex-col gap-2.5 text-left">
          {r.steps.map((step, i) => (
            <li key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-3">
              <span className="flex h-[2.3rem] w-[2.3rem] shrink-0 items-center justify-center rounded-lg border border-[#2fa8ff]/50 bg-[#050a18] text-[#9fe0ff]">{icons[i]}</span>
              <span className="min-w-0 flex-1 text-[1.08rem] leading-snug text-white/85">
                <Strong text={fill(step, { n: total, tools: TOOLS, min: TIME_LIMIT / 60 })} />
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex justify-center gap-1.5" aria-hidden="true">
          {Array.from({ length: TOOLS }, (_, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.55 + i * 0.08, type: 'spring', stiffness: 380, damping: 16 }}
            >
              <Magnifier className="h-[1.6rem] w-[1.6rem] text-gold" />
            </motion.span>
          ))}
        </div>
        <p className="mt-2 text-[0.9rem] text-white/55">{r.toolNote}</p>
        <button
          type="button"
          data-role="rules-start"
          onClick={onStart}
          className="mt-5 min-h-[3.8rem] w-full rounded-xl bg-gold px-4 font-display text-[1.25rem] font-bold text-navy-deep shadow-[0_0.3rem_0_var(--color-gold-deep)] active:translate-y-[0.15rem] active:shadow-[0_0.15rem_0_var(--color-gold-deep)]"
        >
          {r.start}
        </button>
      </motion.div>
    </motion.div>
  )
}

/**
 * 검거 카드 뒷면 옆 '다시 보기' — 사이트의 수상한 네 곳을 한 장에 모아 보여 줍니다.
 * 카드가 가리키는 수법의 자리는 붉게 빛나고(.focus-glow → DefenseCard 가 그리로 스크롤), 나머지는 옅은 붉은 밑줄.
 */
function ReviewSite({ flag, who }: { flag: RedFlag; who: string }) {
  const mark = (target: string) =>
    flag.target === target
      ? 'focus-glow rounded px-0.5 font-bold text-red-700'
      : 'rounded px-0.5 bg-red-50 text-red-700 underline decoration-red-300 decoration-2'
  return (
    <div className="flex flex-col gap-3 text-[#1c1f2a]" data-role="review-site">
      <div className="flex items-center gap-2 rounded-full bg-[#eef0f5] px-3.5 py-2 text-[0.98rem] text-[#4a5368]">
        <LockIcon />
        <span className={mark('fake_domain')}>{vip.site.address}</span>
      </div>
      <div className="rounded-xl bg-[#d4143a] px-3 py-2.5 text-center text-[0.98rem] font-bold text-white">
        <span className={flag.target === 'pressure' ? 'focus-glow rounded px-1' : 'underline decoration-red-200 decoration-2'}>
          {vip.site.bar.label} 02:41 · {fill(vip.site.bar.seats, { n: 3 })}
        </span>
      </div>
      <div className="rounded-xl border border-[#e3e6ee] bg-white px-3.5 py-3">
        <p className="font-display text-[1.1rem] font-bold">
          {vip.verify.step} · {vip.verify.title}
        </p>
        <ul className="mt-2 flex flex-col gap-1.5 text-[0.98rem]">
          {vip.verify.fields.map((f: Field) => (
            <li key={f.id} className="flex items-center justify-between gap-2 rounded-lg bg-[#f4f5f8] px-3 py-2">
              <span className={f.flag ? mark(f.flag) : ''}>{f.label}</span>
              <span className="text-[#8a93a6] tabular-nums">{fill(f.value, { name: who })}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-[#f3c2cb] bg-[#fff1f3] px-3.5 py-3">
        <p className="font-display text-[1.1rem] font-bold">
          {vip.seat.step} · {vip.seat.title}
        </p>
        <p className="mt-1.5 text-[0.98rem] leading-snug">
          <span className={mark('pressure')}>{vip.seat.notice}</span>
        </p>
      </div>
      <div className="rounded-xl border border-[#e3e6ee] bg-white px-3.5 py-3">
        <p className="font-display text-[1.1rem] font-bold">
          {vip.pay.step} · {vip.pay.title}
        </p>
        <p className="mt-1.5 text-[0.98rem] leading-snug">
          <span className={mark('deposit')}>{vip.pay.notice}</span>
        </p>
      </div>
    </div>
  )
}

/* 숫자 상자 — 1번과 같은 색(시간=하늘색, 찾은 곳=금색, 기회=보라) */
const TONE: Record<'time' | 'found' | 'chance', { box: string; label: string }> = {
  time: { box: 'border-[#2fa8ff]/80 bg-[#0d2c5e]/90 shadow-[0_0_1.2rem_rgba(47,168,255,0.3)]', label: 'text-[#9fe0ff]' },
  found: { box: 'border-gold/80 bg-[#3d2f06]/90 shadow-[0_0_1.2rem_rgba(254,202,54,0.3)]', label: 'text-gold' },
  chance: { box: 'border-[#b48cff]/80 bg-[#2b1b52]/90 shadow-[0_0_1.2rem_rgba(180,140,255,0.3)]', label: 'text-[#d9c7ff]' },
}

function Stat({ label, tone, low = false, big = false, children }: { label: string; tone: keyof typeof TONE; low?: boolean; big?: boolean; children: ReactNode }) {
  return (
    <div
      className={`flex min-w-0 flex-1 flex-col items-center rounded-2xl border-2 ${big ? 'px-3 py-4' : 'px-2 py-2'} ${
        low ? 'border-[#ff8080]/90 bg-[#4a1116]/90 shadow-[0_0_1.2rem_rgba(255,90,90,0.4)]' : TONE[tone].box
      }`}
    >
      <span className={`font-bold ${big ? 'text-[1.15rem]' : 'text-[0.92rem]'} ${low ? 'text-[#ffb3b3]' : TONE[tone].label}`}>{label}</span>
      {children}
    </div>
  )
}

function Strong({ text, pulse = false }: { text: string; pulse?: boolean }) {
  return (
    <>
      {text.split('**').map((part, i) =>
        i % 2 ? (
          <b key={i} className={`font-bold whitespace-nowrap text-gold ${pulse ? 'gold-pulse text-[1.2em]' : ''}`}>
            {part}
          </b>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}

/* ─────────────── 아이콘 (SVG) ─────────────── */
function Magnifier({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15.5 15.5L21 21" strokeLinecap="round" />
    </svg>
  )
}
function GlobeIcon({ className = 'h-[1.25rem] w-[1.25rem]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" />
    </svg>
  )
}
function TargetIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.25rem] w-[1.25rem]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" strokeLinecap="round" />
    </svg>
  )
}
function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[0.95rem] w-[0.95rem] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
  )
}
function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.15rem] w-[1.15rem] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.5l3.5 2" strokeLinecap="round" />
    </svg>
  )
}
