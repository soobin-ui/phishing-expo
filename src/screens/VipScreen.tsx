import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { DefenseCard } from '../components/DefenseCard'
import { fill } from '../lib/content'
import vip from '../content/vip.json'
import type { RedFlag, Scenario } from '../types'

/**
 * [4번 기관·기업 사칭] 가짜 통신사 'KTT' VIP 초청 사이트.
 *
 * ★ 3번 스미싱과 같은 '무조건 직접 당해보는' 체험입니다(2026-09-18 사용자 결정).
 *   사건 브리핑 → KTT VIP 멤버십 페이지 + VIP 초청 팝업([VIP 초청 확인하기] 버튼 하나만):
 *   [1회차] 확인하기 → 본인확인(직접 입력) → 초청석 확보 → 보증금 5만원 결제(직접 입력)
 *           → 초청 완료 → 해외결제·명의도용 알림 폭탄 → **피해 화면** → [다시 해보기]
 *   [2회차~] guided=true. 확인하기 → 각 페이지(본인확인·좌석·결제)에서 화면이 어두워지며 **STOP!** 안내:
 *           그 페이지 수법을 하이라이트(주소·타이머/자동배정·선결제) + 경고 → [다음] → 다음 페이지 STOP
 *           → 결제 STOP [다음] → **검거 완료 카드**
 *   ★ '공식 고객센터 먼저 확인' 선택지·닫기 ✕ 는 삭제 — 무조건 끝까지 체험하도록.
 *
 * ★ 본인확인·결제 입력칸은 관람객이 직접 칩니다(체험용이라 아무 숫자나). 화면 상태로만 있다가 사라지며 저장·전송하지 않습니다.
 * ★ KTT · 스페셜 T 는 지어낸 이름입니다(실존 통신사 금지). 콘서트만 사용자 지시로 임영웅 IM HERO THE STADIUM 2 를 씀.
 *   ★ 실제 포스터의 사진·로고는 복제하지 않고, 무대 조명 + 얼굴이 보이지 않는 일반 실루엣 + 공연명 글자로 새로 그림.
 * ★ 이모지 금지 — 아이콘·빵빠레 모두 SVG/도형.
 */
type Stage = 'home' | 'verify' | 'seat' | 'pay' | 'done'
type Phase = 'none' | 'damage' | 'card'

/** 가짜 사이트가 띄우는 마감 타이머(초) — 압박 연출용 */
const SITE_LIMIT = 180
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function VipScreen({
  scenario,
  name,
  onReply,
  onSolved,
}: {
  scenario: Scenario
  name: string
  onReply: (delta: number, gave: string | null) => void
  onSolved: (foundCount: number) => void
}) {
  const flags = scenario.redFlags

  const [brief, setBrief] = useState(true)
  const [stage, setStage] = useState<Stage>('home')
  const [phase, setPhase] = useState<Phase>('none')
  /** 1회차에 결제까지 가서 당한 뒤에는 안내(STOP) 모드 — 각 페이지에서 수법을 짚어 줍니다 */
  const [guided, setGuided] = useState(false)
  /**
   * 안내 모드의 연출 순서(beat):
   *   0 페이지만 보임 → 1 가운데 STOP! 만 반짝 팝업 → 2 STOP 스르륵 사라지고 실제 자리(주소창·타이머)가 반짝 하이라이트
   *   → 3 말풍선이 떠서 "이 사이트 주소, 확인하셨나요?" + 설명 + [다음]
   */
  const [beat, setBeat] = useState(0)
  const [siteLeft, setSiteLeft] = useState(SITE_LIMIT)
  const [alerts, setAlerts] = useState(0)
  const [falls, setFalls] = useState(0)
  const [gave, setGave] = useState<string[]>([])
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))

  const give = (delta: number, items: string[]) => {
    onReply(delta, null)
    setGave((v) => [...v, ...items.filter((i) => !v.includes(i))])
  }

  /* 가짜 사이트의 마감 타이머 — 본인확인 단계부터 흐릅니다(연출) */
  const siteRunning = (stage === 'verify' || stage === 'seat' || stage === 'pay') && phase === 'none'
  useEffect(() => {
    if (!siteRunning) return
    const id = window.setInterval(() => setSiteLeft((v) => Math.max(11, v - 1)), 1000)
    return () => window.clearInterval(id)
  }, [siteRunning])
  const seats = siteLeft > SITE_LIMIT - 25 ? 3 : 2

  /* 안내 모드: 페이지가 바뀌면 STOP 을 잠깐 뒤에 띄웁니다(먼저 페이지를 보여줌) */
  const inGuidedStage = guided && phase === 'none' && (stage === 'verify' || stage === 'seat' || stage === 'pay')
  useEffect(() => {
    setBeat(0)
    if (!inGuidedStage) return
    const ids = [
      window.setTimeout(() => setBeat(1), 1100), // 가운데 STOP! 만
      window.setTimeout(() => setBeat(2), 2500), // STOP 사라지고 실제 자리 하이라이트
      window.setTimeout(() => setBeat(3), 3400), // 말풍선
    ]
    return () => ids.forEach((i) => window.clearTimeout(i))
  }, [inGuidedStage, stage])

  /** 결제 완료 → 초청 빵빠레 → 알림 폭탄 → 피해 화면 */
  const finale = () => {
    setStage('done')
    setFalls((n) => n + 1)
    const n = vip.flood.alerts.length
    for (let i = 0; i < n; i += 1) later(() => setAlerts(i + 1), 1700 + i * 360)
    later(() => setPhase('damage'), 1700 + n * 360 + 1400)
  }

  /** [다시 해보기] — 팝업(홈)으로 돌아가고, 이제부터 안내(STOP) 모드 */
  const retry = () => {
    setPhase('none')
    setStage('home')
    setAlerts(0)
    setSiteLeft(SITE_LIMIT)
    setGuided(true)
  }

  /** 안내 모드에서 [다음] — 본인확인 → 좌석 → 결제 → 검거 카드 */
  const guideNext = () => {
    if (stage === 'verify') setStage('seat')
    else if (stage === 'seat') setStage('pay')
    else setPhase('card')
  }

  return (
    <div className="relative h-full w-full">
      <div
        aria-hidden={brief}
        className={`flex h-full w-full flex-col transition-[filter] duration-500 ${
          brief ? 'pointer-events-none blur-[6px] select-none' : ''
        }`}
      >
        {/* 브라우저 창 — 화면을 꽉 채웁니다(실제 사이트처럼) */}
        <section
          data-role="vip-site"
          className="relative m-0 flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f4f5f8] text-[#1c1f2a] wide:m-4 wide:rounded-2xl wide:shadow-[0_0.6rem_2rem_rgba(0,0,0,0.35)]"
        >
          {/* 브라우저 윗줄 — 안내 모드 주소 단계에서는 이 줄이 흐림 위로 올라와 하이라이트됩니다 */}
          <div
            className={`flex shrink-0 items-center gap-2.5 border-b border-[#e3e6ee] bg-white px-3 py-2 ${
              beat >= 2 && stage === 'verify' ? 'relative z-[55]' : ''
            }`}
          >
            <span className="flex gap-1.5" aria-hidden="true">
              <i className="block h-[0.6rem] w-[0.6rem] rounded-full bg-[#ff6159]" />
              <i className="block h-[0.6rem] w-[0.6rem] rounded-full bg-[#ffbd2e]" />
              <i className="block h-[0.6rem] w-[0.6rem] rounded-full bg-[#28c941]" />
            </span>
            <motion.div
              animate={beat >= 2 && stage === 'verify' ? { boxShadow: ['0 0 0 0 rgba(255,60,60,0)', '0 0 0 3px #ff4d4d, 0 0 1.4rem 0.2rem rgba(255,77,77,0.7)', '0 0 0 0 rgba(255,60,60,0)'] } : {}}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-[#eef0f5] px-3.5 py-1.5 text-[0.98rem] text-[#4a5368]"
            >
              <LockIcon />
              <span className={`truncate ${beat >= 2 && stage === 'verify' ? 'rounded bg-red-100 px-1 font-bold text-red-700 underline decoration-red-400 decoration-2' : ''}`}>
                {vip.site.address}
              </span>
            </motion.div>
          </div>

          {/* 가짜 마감 타이머 — 본인확인부터 상단에 계속 · 크게 · 계속 반짝(거슬리게). 안내 모드 좌석 단계에서 하이라이트 */}
          {stage !== 'home' && stage !== 'done' && (
            <motion.div
              animate={{ backgroundColor: ['#d4143a', '#ff2350', '#d4143a'] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
              className={`flex shrink-0 items-center justify-center gap-3 px-3 py-2.5 text-white ${
                beat >= 2 && stage === 'seat' ? 'relative z-[55] shadow-[0_0_0_3px_#ffd24d,0_0_1.4rem_0.2rem_rgba(255,210,77,0.75)]' : ''
              }`}
            >
              <ClockIcon />
              <span className="text-[1.05rem] font-bold">{vip.site.bar.label}</span>
              <motion.b
                animate={{ scale: [1, 1.18, 1], opacity: [1, 0.55, 1] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                className="font-display text-[2rem] leading-none font-black tabular-nums [text-shadow:0_0_0.6rem_rgba(255,255,255,0.7)]"
              >
                {mmss(siteLeft)}
              </motion.b>
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                className="rounded-full bg-white px-2.5 py-1 text-[0.95rem] font-bold text-[#d4143a]"
              >
                {fill(vip.site.bar.seats, { n: seats })}
              </motion.span>
            </motion.div>
          )}

          <div data-scroll={stage === 'home' ? 'site-home' : 'site-form'} className={`no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain ${guided ? 'pointer-events-none select-none' : ''}`}>
            <SiteHeader />
            {stage === 'home' && <Home />}
            {stage === 'verify' && (
              <Verify
                name={name}
                onNext={() => {
                  give(-40, vip.verify.fields.map((f) => f.gave))
                  setStage('seat')
                }}
              />
            )}
            {stage === 'seat' && <Seat name={name} seats={seats} onNext={() => setStage('pay')} />}
            {stage === 'pay' && (
              <Pay
                onPay={() => {
                  give(-45, vip.pay.fields.map((f) => f.gave))
                  finale()
                }}
              />
            )}
            {stage === 'done' && <Done name={name} />}
          </div>

          {/* VIP 초청 팝업 — 홈에서만. [VIP 초청 확인하기] 하나만(무조건 체험) */}
          <AnimatePresence>
            {stage === 'home' && phase === 'none' && !brief && (
              <Invitation name={name} onOpen={() => setStage('verify')} />
            )}
          </AnimatePresence>

          {/* 안내(STOP) 모드 — 페이지를 먼저 보여준 뒤(stopShown), 흐림 위로 말풍선이 뜹니다 */}
          <AnimatePresence>
            {inGuidedStage && beat >= 1 && <GuidedStop key={stage} step={stage} beat={beat} onNext={guideNext} />}
          </AnimatePresence>

          {/* 초청 완료 위로 쏟아지는 해외결제·새 기기 로그인 알림 */}
          {stage === 'done' && alerts > 0 && phase === 'none' && <Flood count={alerts} />}
        </section>
      </div>

      {/* 피해 화면 — 결제까지 갔을 때 */}
      <AnimatePresence>{phase === 'damage' && <DamageScene gave={gave} onRetry={retry} />}</AnimatePresence>

      {/* 검거 완료 카드 — 위험을 막았을 때만 */}
      <AnimatePresence>
        {phase === 'card' && (
          <DefenseCard
            stats={{
              found: flags.length,
              total: flags.length,
              wrongs: falls * 2,
              misses: gave.length,
              blocked: falls > 0 ? 0 : 2,
            }}
            flags={flags}
            solved={flags.map((f) => f.target)}
            copy={vip.card}
            review={(flag) => <ReviewSite flag={flag} />}
            onNext={() => onSolved(flags.length)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>{brief && <Brief name={name} onStart={() => setBrief(false)} />}</AnimatePresence>
    </div>
  )
}

/* ─────────────── 가짜 사이트 ─────────────── */

/** 통신사 홈페이지 머리 — 유틸바 + 로고 + GNB + 아이콘 (실제 KT VIP 멤버십 페이지 참고) */
function SiteHeader() {
  const s = vip.site
  return (
    <div className="shrink-0 border-b border-[#eef0f4] bg-white">
      <div className="mx-auto flex max-w-[70rem] items-center justify-end gap-2.5 px-4 pt-2 text-[0.76rem] font-semibold text-[#6b7386]" aria-hidden="true">
        {s.utility.map((u, i) => (
          <span key={u} className="flex items-center gap-2.5">
            {i > 0 && <span className="text-[#dfe3ea]">|</span>}
            <span className="flex items-center gap-0.5">
              {u}
              <svg viewBox="0 0 24 24" className="h-[0.7rem] w-[0.7rem] text-[#b7bdc8]" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M7 17L17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          </span>
        ))}
      </div>
      <div className="mx-auto flex max-w-[70rem] items-center gap-5 px-4 py-2.5">
        <b className="font-display text-[1.7rem] leading-none font-black tracking-tight text-[#e01a3c] lowercase">{s.brand}</b>
        <nav className="ml-2 hidden flex-1 items-center gap-6 text-[1rem] font-bold text-[#2a3040] wide:flex" aria-hidden="true">
          {s.menu.map((m) => (
            <span key={m} className={m === s.menuActive ? 'text-[#111]' : ''}>
              {m}
            </span>
          ))}
        </nav>
        <span className="ml-auto flex items-center gap-3.5 text-[#3a4256]" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-[1.3rem] w-[1.3rem]" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <svg viewBox="0 0 24 24" className="h-[1.3rem] w-[1.3rem]" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
          <svg viewBox="0 0 24 24" className="hidden h-[1.3rem] w-[1.3rem] wide:block" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M4 13a8 8 0 0116 0M4 13v3a2 2 0 002 2M20 13v3a2 2 0 01-2 2h-3" strokeLinecap="round" /></svg>
          <svg viewBox="0 0 24 24" className="h-[1.3rem] w-[1.3rem]" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M6 6h15l-1.5 9h-12z M6 6L5 3H3M9 20a1 1 0 100-2 1 1 0 000 2zM18 20a1 1 0 100-2 1 1 0 000 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <svg viewBox="0 0 24 24" className="h-[1.4rem] w-[1.4rem]" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg>
        </span>
      </div>
    </div>
  )
}

/** 홈페이지 본문 — 실제 KT VIP 멤버십 페이지 구조: 브레드크럼 · 히어로 · 초이스 탭 · 등급 표 · 각주 */
function Home() {
  const s = vip.site
  return (
    <div className="bg-white pb-8">
      <div className="relative overflow-hidden bg-[linear-gradient(180deg,#f6dfe0_0%,#faeede_55%,#ffffff_100%)] px-4 pt-3 pb-12 text-center">
        <div className="pointer-events-none absolute -left-10 top-8 h-48 w-48 rounded-full bg-white/40" aria-hidden="true" />
        <div className="pointer-events-none absolute right-4 top-2 h-40 w-40 rounded-full bg-white/30" aria-hidden="true" />
        <div className="relative mx-auto flex max-w-[64rem] items-center justify-end gap-1.5 text-[0.8rem] text-[#8a7f7a]" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-[0.9rem] w-[0.9rem]" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M4 11l8-7 8 7M6 10v9h12v-9" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {s.breadcrumb.map((b, i) => (
            <span key={b} className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="h-[0.75rem] w-[0.75rem] text-[#c9beb8]" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span className={i === s.breadcrumb.length - 1 ? 'font-bold text-[#5a4f4a]' : ''}>{b}</span>
            </span>
          ))}
        </div>
        <h2 className="relative mt-6 font-display text-[2.4rem] leading-none font-black text-[#2a2320]">{s.pageTitle}</h2>
        <p className="relative mt-3 text-[1.05rem] font-semibold text-[#6b5f58]">{s.pageSub}</p>
      </div>

      <div className="mx-auto max-w-[64rem] px-4">
        <div className="-mt-6 grid grid-cols-2 overflow-hidden rounded-lg shadow-[0_0.3rem_1rem_rgba(20,30,60,0.12)]" aria-hidden="true">
          <div className="border-2 border-[#e01a3c] bg-white py-3.5 text-center font-display text-[1.15rem] font-bold text-[#e01a3c]">{s.tabs[0]}</div>
          <div className="bg-[#7c8291] py-3.5 text-center font-display text-[1.15rem] font-bold text-white">{s.tabs[1]}</div>
        </div>

        <h3 className="mt-8 font-display text-[1.4rem] font-black text-[#1c1f2a]">{s.tableTitle}</h3>
        <div className="mt-3 border-t-2 border-[#2a3040]">
          <div className="grid grid-cols-[0.8fr_1.6fr_1.4fr] bg-[#eef0f4] text-center text-[0.95rem] font-bold text-[#3a4256]">
            {s.tableHead.map((th) => (
              <div key={th} className="border-b border-[#dfe3ea] px-2 py-3">{th}</div>
            ))}
          </div>
          <div className="grid grid-cols-[0.8fr_1.6fr_1.4fr] items-center border-b border-[#e3e6ee] text-center">
            <div className="px-2 py-5 font-display text-[1.05rem] font-bold text-[#2a3040]">{s.tableRow.grade}</div>
            <div className="px-2 py-5">
              <p className="text-[0.92rem] leading-relaxed whitespace-pre-line text-[#3a4256]">{s.tableRow.target}</p>
              <span className="mt-2 inline-block rounded border border-[#d5d9e3] px-3 py-1.5 text-[0.82rem] font-semibold text-[#5a6377]">{s.tableRow.targetCta}</span>
            </div>
            <div className="px-2 py-5">
              <p className="text-[0.92rem] leading-relaxed whitespace-pre-line text-[#3a4256]">{s.tableRow.benefit}</p>
              <span className="mt-2 inline-block rounded border border-[#d5d9e3] px-3 py-1.5 text-[0.82rem] font-semibold text-[#5a6377]">{s.tableRow.benefitCta}</span>
            </div>
          </div>
        </div>

        <ul className="mt-4 flex flex-col gap-1.5">
          {s.notes.map((n, i) => (
            <li key={i} className="flex gap-1.5 text-[0.82rem] leading-snug text-[#8a93a6]">
              <span className="shrink-0">*</span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-auto mt-8 max-w-[64rem] border-t border-[#e3e6ee] px-4 pt-4">
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

/** VIP 초청 팝업 — 여기서 직접 선택합니다(3번의 선택지와 같은 역할) */
function Invitation({ name, onOpen }: { name: string; onOpen: () => void }) {
  const p = vip.popup
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 px-4 py-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.82, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.4 }}
        role="dialog"
        data-role="vip-popup"
        className="relative w-full max-w-[24rem] rounded-2xl border border-[#d8b35a] bg-gradient-to-b from-[#16120a] to-[#0a0806] px-4 pb-3.5 pt-7 text-center text-white shadow-[0_0_2.4rem_rgba(216,179,90,0.5)]"
      >
        <p className="font-display text-[0.95rem] font-bold tracking-[0.42em] text-[#e6c77a]">{p.eyebrow}</p>
        <div className="mx-auto mt-2 h-px w-[60%] bg-gradient-to-r from-transparent via-[#d8b35a] to-transparent" />
        <p className="mt-2.5 font-display text-[1.2rem] leading-snug font-bold">{fill(p.hello, { name })}</p>
        <p className="mt-1 text-[0.92rem] leading-snug text-white/80">{p.selected}</p>

        {/* 콘서트 포스터 — 오리지널 그래픽(실제 포스터 사진·로고 미사용) */}
        {/* 포스터는 높이 기준(화면 34%)으로 — 팝업이 스크롤 없이 한 화면에 들어오게 */}
        <div className="mx-auto mt-3 aspect-[3/4] h-[min(34dvh,22rem)] overflow-hidden rounded-lg border border-[#d8b35a]/50 shadow-[0_0.4rem_1.4rem_rgba(0,0,0,0.6)]">
          <ConcertPoster p={p} />
        </div>
        <p className="mt-2 inline-block rounded-full bg-[#e6c77a] px-3.5 py-0.5 font-display text-[1rem] font-bold text-[#2a1f08]">{p.ticketSeat}</p>

        <motion.p
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          className="mt-1.5 text-[0.92rem] font-bold text-[#ff8a9c]"
        >
          {p.rush}
        </motion.p>

        {/* ① 초청 확인하기 — 반짝반짝(미끼) */}
        <motion.button
          type="button"
          data-role="vip-open"
          onClick={onOpen}
          animate={{
            scale: [1, 1.035, 1],
            boxShadow: [
              '0 0.25rem 0 #8a6a1e, 0 0 0 0 rgba(255,225,150,0)',
              '0 0.25rem 0 #8a6a1e, 0 0 1.6rem 0.3rem rgba(255,225,150,0.95)',
              '0 0.25rem 0 #8a6a1e, 0 0 0 0 rgba(255,225,150,0)',
            ],
          }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          whileTap={{ scale: 0.97 }}
          className="mt-2.5 min-h-[3.3rem] w-full rounded-xl bg-gradient-to-b from-[#ffe6a3] to-[#c99a3a] px-4 font-display text-[1.2rem] font-black text-[#2a1f08]"
        >
          {p.cta}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

/**
 * 콘서트 포스터 — 전부 오리지널 그래픽입니다.
 * ★ 실제 공연 포스터의 사진·로고·디자인을 복제하지 않습니다. 무대 조명과 얼굴이 보이지 않는(역광)
 *   일반 가수 실루엣을 직접 그리고, 공연명은 큰 글자로만 얹습니다. IM HERO 를 가장 크게.
 */
function ConcertPoster({ p }: { p: typeof vip.popup }) {
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden bg-[radial-gradient(90%_60%_at_50%_28%,#6d93d6_0%,#2a4a8c_38%,#0b1636_78%)]">
      {/* 무대 조명 빔(머리 뒤가 가장 밝아 얼굴이 역광으로 안 보이게) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-[6%] h-[70%] w-[38%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(220,235,255,0.85),transparent)] blur-[2px]" />
        <div className="absolute left-1/2 -top-8 h-[120%] w-14 -translate-x-1/2 rotate-[15deg] bg-[linear-gradient(180deg,rgba(255,255,255,0.4),transparent)] blur-md" />
        <div className="absolute left-1/2 -top-8 h-[120%] w-10 -translate-x-1/2 -rotate-[17deg] bg-[linear-gradient(180deg,rgba(255,255,255,0.3),transparent)] blur-md" />
      </div>

      {/* 얼굴이 보이지 않는 역광 실루엣(오리지널) — 마이크 스탠드 앞에 선 가수, 사람 비율로 */}
      <svg viewBox="0 0 200 300" className="absolute inset-x-0 bottom-0 mx-auto h-[86%]" aria-hidden="true">
        <g fill="#050a1c">
          {/* 머리(머리카락 결) */}
          <path d="M86 44c-3-14 6-27 20-27 13 0 22 10 21 24 1 3 1 7-1 10 2 6-1 13-6 16-3 6-9 9-15 9s-12-3-15-9c-5-3-8-10-6-16-1-3-1-5 2-7z" />
          <path d="M84 30c4-10 14-16 24-15 8 1 14 6 17 13-8-3-16-2-22 1-6-2-13-1-19 1z" />
          {/* 목 */}
          <rect x="97" y="72" width="14" height="14" />
          {/* 상의(반팔 티) 몸통 */}
          <path d="M72 96c6-8 16-13 32-13s26 5 32 13l6 60c0 4-3 7-7 7H73c-4 0-7-3-7-7z" />
          {/* 마이크 스탠드를 잡은 오른팔(위로) */}
          <path d="M130 100c9 2 16 8 20 18l7 26c1 6-6 9-9 3l-9-22-9-7z" />
          <path d="M137 88c4-2 9 0 11 4l6 14-9 5-8-16c-2-3-2-5 0-7z" />
          {/* 주머니에 넣은 왼팔 */}
          <path d="M74 100c-7 4-11 11-13 20l-4 30c-1 6 6 8 8 2l6-24 8-8z" />
          {/* 바지·다리 */}
          <path d="M70 160h70l-6 118c0 4-3 6-7 6h-12c-4 0-6-3-6-7l-3-72-5 72c0 4-3 7-7 7H82c-4 0-7-3-7-6z" />
          {/* 마이크 스탠드 + 빈티지 마이크 */}
          <rect x="148" y="70" width="4" height="220" rx="2" />
          <ellipse cx="150" cy="290" rx="18" ry="4" />
          <rect x="141" y="58" width="18" height="24" rx="8" />
          <path d="M141 66h18v3h-18zM141 72h18v3h-18z" fill="#1c2a55" />
        </g>
      </svg>
      {/* 아티스트명(작게, 위) */}
      <p className="absolute inset-x-0 top-[7%] text-center font-display text-[0.72rem] font-bold tracking-[0.42em] text-white/95">{p.ticketArtist}</p>

      {/* IM HERO — 가장 크게 */}
      <p className="absolute inset-x-0 top-[15%] text-center font-display text-[clamp(1.6rem,5.2dvh,2.5rem)] leading-none font-black tracking-tight text-white [text-shadow:0_0_0.9rem_rgba(150,190,255,0.95)]">
        {p.ticketTour}
      </p>

      {/* THE STADIUM 2 + 일정/장소(아래) */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#060c1f] via-[#060c1f]/80 to-transparent px-2 pb-2.5 pt-6 text-center">
        <p className="font-display text-[1.15rem] leading-none font-black tracking-tight text-white">{p.ticketTitle}</p>
        <p className="mt-1.5 text-[0.5rem] font-semibold leading-tight text-white/85">{p.ticketDates.join('  ')}</p>
        <p className="mt-0.5 text-[0.5rem] font-semibold tracking-[0.2em] text-white/70">{p.ticketVenue}</p>
      </div>
    </div>
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

type Field = { id: string; label: string; ph: string; gave: string }

/** 입력값 정리·형식 — 체험용이라 아무 숫자나 칠 수 있게, 자릿수만 제한 */
const MIN: Record<string, number> = { name: 1, phone: 10, rrn: 6, card: 15, exp: 4, cvc: 3, pw: 2 }
/** 주민등록번호는 앞 6자리만 치게 하고 뒷자리는 ******* 로 자동 표시(사용자 결정) */
const MAXD: Record<string, number> = { phone: 11, rrn: 6, card: 16, exp: 4, cvc: 3, pw: 2 }
function clean(id: string, v: string) {
  if (id === 'name') return v.slice(0, 12)
  return v.replace(/\D/g, '').slice(0, MAXD[id] ?? 20)
}
function display(id: string, raw: string) {
  if (id === 'name') return raw
  const d = raw
  if (id === 'phone') return d.replace(/^(\d{3})(\d{0,4})(\d{0,4}).*$/, (_m, a, b, c) => [a, b, c].filter(Boolean).join('-'))
  if (id === 'rrn') return d.length >= 6 ? `${d.slice(0, 6)}-*******` : d
  if (id === 'card') return (d.match(/.{1,4}/g) ?? []).join(' ')
  if (id === 'exp') return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d
  return d
}

function useForm(fields: Field[]) {
  const [raw, setRaw] = useState<Record<string, string>>({})
  const setField = (id: string, v: string) => setRaw((p) => ({ ...p, [id]: clean(id, v) }))
  const complete = fields.every((f) => (raw[f.id]?.length ?? 0) >= (MIN[f.id] ?? 1))
  return { raw, setField, complete }
}

/** 직접 입력하는 입력칸 */
function InputField({ field, value, onChange }: { field: Field; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="mb-1.5 text-[0.95rem] font-bold text-[#3a4256]">{field.label}</p>
      <input
        data-role={`vip-field-${field.id}`}
        value={display(field.id, value)}
        onChange={(e) => onChange(e.target.value)}
        inputMode={field.id === 'name' ? 'text' : 'numeric'}
        placeholder={field.ph}
        autoComplete="off"
        className="min-h-[clamp(2.6rem,5.4dvh,3.2rem)] w-full rounded-xl border border-[#d5d9e3] bg-white px-4 text-[1.1rem] text-[#1c1f2a] outline-none placeholder:text-[#a3abb8] focus:border-[#d4143a]"
      />
    </div>
  )
}

function SiteButton({
  role,
  disabled,
  blink,
  onClick,
  children,
}: {
  role: string
  disabled?: boolean
  blink?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <motion.button
      type="button"
      data-role={role}
      disabled={disabled}
      onClick={onClick}
      animate={
        blink && !disabled
          ? {
              boxShadow: [
                '0 0.2rem 0 #8f0d27, 0 0 0 0 rgba(255,90,120,0)',
                '0 0.2rem 0 #8f0d27, 0 0 1.4rem 0.25rem rgba(255,90,120,0.85)',
                '0 0.2rem 0 #8f0d27, 0 0 0 0 rgba(255,90,120,0)',
              ],
            }
          : undefined
      }
      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      whileTap={{ scale: 0.98 }}
      className="mt-[clamp(0.6rem,2dvh,1rem)] min-h-[clamp(2.9rem,6dvh,3.5rem)] w-full rounded-xl bg-[#d4143a] px-4 text-[1.15rem] font-bold text-white shadow-[0_0.2rem_0_#8f0d27] active:translate-y-[0.1rem] disabled:opacity-35"
    >
      {children}
    </motion.button>
  )
}

/** ① VIP 본인확인 — 이름·전화·주민등록번호 전체를 직접 입력 */
function Verify({ name, onNext }: { name: string; onNext: () => void }) {
  const v = vip.verify
  const { raw, setField, complete } = useForm(v.fields)
  return (
    <div className="mx-auto w-full max-w-[32rem] px-5 py-[clamp(0.7rem,2.4dvh,1.25rem)]">
      <StageHead step={v.step} title={v.title} />
      <p className="mt-1.5 text-[1rem] text-[#5a6377]">{fill(v.body, { name })}</p>
      <div className="mt-[clamp(0.6rem,2dvh,1rem)] flex flex-col gap-[clamp(0.5rem,1.7dvh,0.875rem)]">
        {v.fields.map((f: Field) => (
          <InputField key={f.id} field={f} value={raw[f.id] ?? ''} onChange={(val) => setField(f.id, val)} />
        ))}
      </div>
      <p className="mt-[clamp(0.4rem,1.4dvh,0.75rem)] text-[0.82rem] leading-snug text-[#8a93a6]">{vip.site.demoNote}</p>
      <SiteButton role="vip-verify-next" disabled={!complete} onClick={onNext}>
        {v.cta}
      </SiteButton>
    </div>
  )
}

/** ② 초청석 확보 — 남은 좌석 · 자동 배정 압박, 확보 버튼 반짝 */
function Seat({ name, seats, onNext }: { name: string; seats: number; onNext: () => void }) {
  const s = vip.seat
  return (
    <div className="mx-auto w-full max-w-[32rem] px-5 py-5">
      <StageHead step={s.step} title={s.title} />
      <p className="mt-1.5 text-[1rem] text-[#5a6377]">{fill(s.body, { name })}</p>

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

      <p className="mt-3.5 rounded-xl border border-[#f3c2cb] bg-[#fff1f3] px-3.5 py-3 text-[0.98rem] leading-snug text-[#5a1222]">{s.notice}</p>
      <SiteButton role="vip-seat-next" blink onClick={onNext}>
        {s.cta}
      </SiteButton>
    </div>
  )
}

/** ③ 예약 보증금 결제 — 카드 정보 전부를 직접 입력 */
function Pay({ onPay }: { onPay: () => void }) {
  const p = vip.pay
  const { raw, setField, complete } = useForm(p.fields)
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
      <p className="mt-3 rounded-xl border border-[#e3e6ee] bg-white px-3.5 py-3 text-[0.98rem] leading-snug text-[#3a4256]">{p.notice}</p>
      <div className="mt-3 flex items-center justify-between rounded-xl bg-[#12141c] px-4 py-3 text-white">
        <span className="text-[0.95rem] text-white/70">{p.amountLabel}</span>
        <b className="font-display text-[1.5rem] text-[#e6c77a]">{p.amount}</b>
      </div>
      <div className="mt-3.5 grid grid-cols-2 gap-3">
        {p.fields.map((f: Field, i: number) => (
          <div key={f.id} className={i === 0 ? 'col-span-2' : i === 3 ? 'col-span-2' : ''}>
            <InputField field={f} value={raw[f.id] ?? ''} onChange={(val) => setField(f.id, val)} />
          </div>
        ))}
      </div>
      <p className="mt-3 text-[0.82rem] leading-snug text-[#8a93a6]">{vip.site.demoNote}</p>
      <SiteButton role="vip-pay" blink disabled={!complete || paying} onClick={pay}>
        {paying ? p.paying : p.cta}
      </SiteButton>
    </div>
  )
}

/** 초청 완료 — 빵빠레(색종이) */
function Done({ name }: { name: string }) {
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
        <p className="mt-1.5 text-[1rem] text-[#5a6377]">{fill(d.body, { name })}</p>
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

/* ─────────────── 결말 상자들 ─────────────── */

/** 결제까지 간 결말 — 피해 화면. [다시 해보기] → 팝업으로 돌아가 다른 선택을 해 보게 합니다. */
function DamageScene({ gave, onRetry }: { gave: string[]; onRetry: () => void }) {
  const d = vip.damage
  const [shown, setShown] = useState(0)
  /** 알림은 3개만 — [다시 해보기]까지 스크롤 없이 한 화면에 들어오게 */
  const total = 3
  useEffect(() => {
    if (shown >= total) return
    const id = window.setTimeout(() => setShown((n) => n + 1), shown === 0 ? 350 : 500)
    return () => window.clearTimeout(id)
  }, [shown, total])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-role="vip-damage"
      className="absolute inset-0 z-40 flex items-center justify-center bg-[#1a0508]/92 px-4 py-4 backdrop-blur-sm"
    >
      <div className="no-scrollbar max-h-full w-full max-w-[32rem] overflow-y-auto rounded-2xl border border-[#ff6b6b]/60 bg-[#1f0a10]/95 px-[clamp(0.9rem,3.5vw,1.4rem)] py-[clamp(0.9rem,2dvh,1.2rem)] text-white shadow-[0_0_2.4rem_rgba(255,107,107,0.35)]">
        <div className="text-center">
          <span className="inline-block rounded-md bg-[#ff6b6b] px-2.5 py-1 font-display text-[0.8rem] leading-none font-bold text-[#2a0509]">{d.tag}</span>
          <h2 className="mt-2 font-display text-[min(1.2rem,4.6vw)] leading-snug font-bold whitespace-pre-line [text-shadow:0_0_1rem_rgba(255,107,107,0.6)]">{d.title}</h2>
        </div>

        <div className="mt-3 rounded-xl bg-[#2b3246] p-2.5">
          <p className="mb-1.5 text-center text-[0.78rem] font-bold text-white/55">{d.phone}</p>
          <div className="flex min-h-[9.6rem] flex-col gap-1.5">
            {vip.flood.alerts.slice(0, shown).map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: -14, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                className="rounded-xl bg-white px-3 py-2 text-[#1f2430]"
              >
                <p className="text-[0.74rem] font-bold text-[#e5484d]">{a.from}</p>
                <p className="mt-0.5 text-[0.9rem] leading-snug">{a.text}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 넘긴 정보·교훈·버튼은 바로 — 알림은 위에서 따로 차례로 쌓입니다 */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          {gave.length > 0 && (
              <div className="mt-2.5 text-center">
                <p className="text-[0.8rem] font-bold text-white/55">{d.gaveTitle}</p>
                <div className="mt-1 flex flex-wrap justify-center gap-1.5">
                  {gave.map((g) => (
                    <span key={g} className="rounded-full border border-[#ff6b6b]/60 bg-[#2a0509] px-2.5 py-1 text-[0.88rem] font-bold text-[#ffb4b4]">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-2.5 text-center text-[0.9rem] leading-snug whitespace-pre-line text-white/80">{d.lesson}</p>
            <button
              type="button"
              data-role="vip-retry"
              onClick={onRetry}
              className="mt-3 min-h-[3.2rem] w-full rounded-xl bg-gold px-4 font-display text-[1.2rem] font-bold text-navy-deep shadow-[0_0.3rem_0_var(--color-gold-deep)] active:translate-y-[0.15rem] active:shadow-[0_0.15rem_0_var(--color-gold-deep)]"
            >
              {d.retry}
            </button>
        </motion.div>
      </div>
    </motion.div>
  )
}

/**
 * 안내(STOP) 모드 — 2회차(다시 해보기)부터 각 페이지에서 뜹니다.
 * 화면을 어둡게 덮고 큰 빨간 STOP! 을 띄운 뒤, 그 페이지의 수법을 밝게 짚어 주고 [다음]으로 넘어갑니다.
 *   verify → 주소창(공식 주소 아님) · seat → 타이머·남은 좌석·자동 배정 압박 · pay → 선결제 보증금
 */
function GuidedStop({ step, beat, onNext }: { step: 'verify' | 'seat' | 'pay'; beat: number; onNext: () => void }) {
  const key = step === 'verify' ? 'url' : step === 'seat' ? 'pressure' : 'deposit'
  const g = vip.guide.steps[key]
  // 하이라이트되는 실제 요소(주소창·타이머) 바로 아래에 말풍선을 답니다. 결제는 가운데.
  const anchor =
    step === 'verify'
      ? 'top-[3.4rem] left-3 right-3 justify-start'
      : step === 'seat'
        ? 'top-[6.9rem] left-3 right-3 justify-start'
        : 'inset-0 items-center justify-center'
  const tail = step !== 'pay'
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-role="vip-stop"
      className="absolute inset-0 z-40 bg-[#050a18]/45 backdrop-blur-[3px]"
    >
      {/* ① 가운데 STOP! 하나만 — 반짝이며 팝업했다가 스르륵 사라집니다 */}
      <AnimatePresence>
        {beat === 1 && (
          <motion.div
            key="stop"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.25, filter: 'blur(6px)' }}
            transition={{ type: 'spring', stiffness: 300, damping: 16 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <motion.span
              data-role="vip-stop-badge"
              animate={{
                scale: [1, 1.08, 1],
                boxShadow: [
                  '0 0 0 0 rgba(255,60,60,0)',
                  '0 0 2.6rem 0.7rem rgba(255,60,60,0.95)',
                  '0 0 0 0 rgba(255,60,60,0)',
                ],
              }}
              transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-flex h-[5rem] items-center rounded-2xl bg-[#e5142e] px-10 font-display text-[3rem] leading-none font-black tracking-[0.08em] text-white"
            >
              {vip.guide.stop}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ③ 말풍선 — 하이라이트된 자리 아래에서 떠오릅니다 */}
      <AnimatePresence>
        {beat >= 3 && (
          <div key="bubble" className={`absolute flex px-1 ${anchor}`}>
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              className="relative w-full max-w-[30rem] rounded-2xl border-2 border-[#ff5a5a] bg-[#160a10]/97 px-4 py-4 text-center text-white shadow-[0_0_2.2rem_rgba(255,60,60,0.5)]"
            >
              {/* 말풍선 꼬리 — 위(하이라이트된 자리)를 가리킵니다 */}
              {tail && <span className="absolute -top-[0.65rem] left-8 h-3.5 w-3.5 rotate-45 border-l-2 border-t-2 border-[#ff5a5a] bg-[#160a10]" />}

              <h2 className="font-display text-[min(1.3rem,5.2vw)] leading-snug font-bold">{g.title}</h2>

              {/* 결제 단계는 하이라이트할 상단 바가 없어 문구를 말풍선 안에 보여 줍니다 */}
              {step === 'pay' && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2.5 text-left text-[0.98rem] leading-snug font-semibold text-red-700">{vip.pay.notice}</p>
              )}

              <p className="mt-2.5 text-[0.96rem] leading-snug text-white/85">{g.warn}</p>

              <button
                type="button"
                data-role="vip-stop-next"
                onClick={onNext}
                className="mt-3.5 min-h-[3.3rem] w-full rounded-xl bg-gold px-4 font-display text-[1.2rem] font-bold text-navy-deep shadow-[0_0.3rem_0_var(--color-gold-deep)] active:translate-y-[0.15rem] active:shadow-[0_0.15rem_0_var(--color-gold-deep)]"
              >
                {vip.guide.next}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/** 사건 브리핑 — 3번 스미싱과 같은 상자(번호 단계). {name} 치환, **굵게**는 금색 */
function Brief({ name, onStart }: { name: string; onStart: () => void }) {
  const b = vip.brief
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
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        className="w-full max-w-[30rem] rounded-2xl border border-[#2fa8ff]/60 bg-[#0b1631]/95 px-[clamp(1.2rem,4vw,1.8rem)] py-[clamp(1.2rem,3dvh,1.8rem)] text-center text-white shadow-[0_0_2.4rem_rgba(47,168,255,0.35),inset_0_0_1.6rem_rgba(47,168,255,0.08)]"
      >
        <span className="inline-flex items-center gap-1.5 rounded-md bg-gold px-2.5 py-1 font-display text-[0.85rem] leading-none font-bold text-navy-deep">
          <GlobeIcon className="h-[0.95rem] w-[0.95rem]" />
          사건 브리핑
        </span>
        <h2 className="mt-3 font-display text-[min(1.6rem,6vw)] leading-snug font-bold whitespace-pre-line [text-shadow:0_0_1rem_rgba(47,168,255,0.6)]">
          {/* 참여자 이름(**굵게** 부분)은 2번 브리핑과 같은 금색으로 */}
          {fill(b.title, { name }).split('**').map((part, k) =>
            k % 2 ? (
              <b key={k} className="font-bold whitespace-nowrap text-gold [text-shadow:0_0_1rem_rgba(254,202,54,0.55)]">{part}</b>
            ) : (
              <span key={k}>{part}</span>
            ),
          )}
        </h2>
        <ol className="mt-5 flex flex-col gap-2.5 text-left">
          {b.steps.map((step, i) => (
            <li key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-3">
              <span className="flex h-[2.3rem] w-[2.3rem] shrink-0 items-center justify-center rounded-lg border border-[#2fa8ff]/50 bg-[#050a18] font-display text-[1.05rem] font-bold text-[#9fe0ff]">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 text-[1.08rem] leading-snug whitespace-pre-line text-white/85">
                <Strong text={step} />
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[0.9rem] leading-snug text-white/55">{b.note}</p>
        <button
          type="button"
          data-role="brief-start"
          onClick={onStart}
          className="mt-5 min-h-[3.8rem] w-full rounded-xl bg-gold px-4 font-display text-[1.25rem] font-bold text-navy-deep shadow-[0_0.3rem_0_var(--color-gold-deep)] active:translate-y-[0.15rem] active:shadow-[0_0.15rem_0_var(--color-gold-deep)]"
        >
          수사 시작하기
        </button>
      </motion.div>
    </motion.div>
  )
}

/**
 * 검거 카드 뒷면 옆 '다시 보기' — 사이트의 수법 네 곳을 한 장에 모아 보여 줍니다.
 * 카드가 가리키는 수법의 자리는 붉게 빛나고(.focus-glow), 나머지는 옅은 붉은 밑줄.
 */
function ReviewSite({ flag }: { flag: RedFlag }) {
  const mark = (target: string) =>
    flag.target === target
      ? 'focus-glow rounded px-0.5 font-bold text-red-700'
      : 'rounded px-0.5 bg-red-50 text-red-700 underline decoration-red-300 decoration-2'
  const sample: Record<string, string> = {
    name: '홍○○',
    phone: '010-●●●●-●●●●',
    rrn: '●●●●●●-*******',
  }
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
              <span className={f.id === 'rrn' ? mark('overask') : ''}>{f.label}</span>
              <span className="text-[#8a93a6] tabular-nums">{sample[f.id]}</span>
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

function Strong({ text }: { text: string }) {
  return (
    <>
      {text.split('**').map((part, i) => (i % 2 ? <b key={i} className="font-bold whitespace-nowrap text-gold">{part}</b> : <span key={i}>{part}</span>))}
    </>
  )
}

/* ─────────────── 아이콘 (SVG) ─────────────── */
function GlobeIcon({ className = 'h-[1.25rem] w-[1.25rem]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" />
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
    <svg viewBox="0 0 24 24" className="h-[1.3rem] w-[1.3rem] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.5l3.5 2" strokeLinecap="round" />
    </svg>
  )
}
