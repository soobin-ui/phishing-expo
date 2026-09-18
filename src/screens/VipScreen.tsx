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
 * ★ 3번 스미싱과 같은 '직접 피해자가 되어 보는' 체험입니다(2026-09-18 사용자 결정).
 *   수상한 곳을 찾는 게 아니라, 본인확인부터 결제까지 **실제로 다 해보고** 그 결말(해외결제·명의도용)을 겪습니다.
 *
 *   사건 브리핑(1번과 같은 상자) → KTT 홈페이지 + VIP INVITATION 팝업
 *     ├─ [VIP 초청 확인하기] → ① 본인확인(주민번호 전체) → ② 초청석 확보(타이머·자동배정 압박)
 *     │    → ③ 예약 보증금 5만원 결제(카드 전부) → 초청 완료 빵빠레 → 해외결제·새 기기 로그인 알림 폭탄
 *     │    → **피해 화면**(넘긴 정보 목록 + 교훈) → [다시 해보기] → 팝업으로
 *     └─ [이 초청이 진짜인지 확인] → 공식 고객센터에 물어봄 → 가짜로 드러남 → 사이트 닫기·신고
 *          → 위험 차단 → [다음] → **검거 완료 카드**(1·2·3번과 같은 DefenseCard, 뒷면 옆에 그 사이트 다시 보기)
 *
 * ★ 결제까지 가도 끝이 아니라 피해를 보여 주고 다시 고르게 합니다. 결제 전에 멈추고 확인해야 검거 카드로 갑니다.
 * ★ 입력칸은 누르면 체험용 가상값이 자동으로 채워집니다 — 실제 주민번호·카드번호를 치는 일은 없고, 저장·전송도 없습니다.
 * ★ KTT · 스페셜 T 는 지어낸 이름입니다(실존 통신사 금지). 콘서트만 사용자 지시로 임영웅 IM HERO THE STADIUM 2 를 씁니다(글자만, 포스터 이미지 없음).
 * ★ 이모지 금지 — 아이콘·빵빠레 모두 SVG/도형.
 */
type Stage = 'home' | 'verify' | 'seat' | 'pay' | 'done'
type Phase = 'none' | 'damage' | 'safe' | 'card'

/** 가짜 사이트가 띄우는 마감 타이머(초) — 압박 연출용(찾는 대상 아님) */
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
  /** 정보를 넘기면 안전도를 깎습니다(마무리 화면 안전도에 반영) */
  onReply: (delta: number, gave: string | null) => void
  onSolved: (foundCount: number) => void
}) {
  const flags = scenario.redFlags

  const [rules, setRules] = useState(true)
  const [stage, setStage] = useState<Stage>('home')
  const [phase, setPhase] = useState<Phase>('none')
  const [siteLeft, setSiteLeft] = useState(SITE_LIMIT)
  const [alerts, setAlerts] = useState(0)
  /** 끝까지 결제해서 당한 횟수 · 그동안 넘긴 정보 — 검거 카드 별점에 씁니다 */
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

  /** 결제 완료 → 초청 빵빠레 → 알림 폭탄 → 피해 화면 */
  const finale = () => {
    setStage('done')
    setFalls((n) => n + 1)
    const n = vip.flood.alerts.length
    for (let i = 0; i < n; i += 1) later(() => setAlerts(i + 1), 1700 + i * 360)
    later(() => setPhase('damage'), 1700 + n * 360 + 1400)
  }

  /** [다시 해보기] — 팝업(홈)으로 돌아갑니다. 넘긴 정보·당한 횟수는 그대로 두어 카드 별점에 반영 */
  const retry = () => {
    setPhase('none')
    setStage('home')
    setAlerts(0)
    setSiteLeft(SITE_LIMIT)
  }

  return (
    <div className="relative h-full w-full">
      <div
        aria-hidden={rules}
        className={`flex h-full w-full flex-col transition-[filter] duration-500 ${
          rules ? 'pointer-events-none blur-[6px] select-none' : ''
        }`}
      >
        {/* 브라우저 창 — 화면을 꽉 채웁니다(실제 사이트처럼) */}
        <section
          data-role="vip-site"
          className="relative m-0 flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f4f5f8] text-[#1c1f2a] wide:m-4 wide:rounded-2xl wide:shadow-[0_0.6rem_2rem_rgba(0,0,0,0.35)]"
        >
          {/* 브라우저 윗줄 */}
          <div className="flex shrink-0 items-center gap-2.5 border-b border-[#e3e6ee] bg-white px-3 py-2">
            <span className="flex gap-1.5" aria-hidden="true">
              <i className="block h-[0.6rem] w-[0.6rem] rounded-full bg-[#ff6159]" />
              <i className="block h-[0.6rem] w-[0.6rem] rounded-full bg-[#ffbd2e]" />
              <i className="block h-[0.6rem] w-[0.6rem] rounded-full bg-[#28c941]" />
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-[#eef0f5] px-3.5 py-1.5 text-[0.98rem] text-[#4a5368]">
              <LockIcon />
              <span className="truncate">{vip.site.address}</span>
            </div>
          </div>

          {/* 가짜 마감 타이머 — 본인확인부터 상단에 계속(압박 연출) */}
          {stage !== 'home' && stage !== 'done' && (
            <div className="flex shrink-0 items-center justify-center gap-3 bg-[#d4143a] px-3 py-2 text-[1rem] font-bold text-white">
              <ClockIcon />
              <span>{vip.site.bar.label}</span>
              <b className={`font-display text-[1.25rem] tabular-nums ${siteLeft <= 60 ? 'timer-shake' : ''}`}>{mmss(siteLeft)}</b>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[0.9rem]">{fill(vip.site.bar.seats, { n: seats })}</span>
            </div>
          )}

          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
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

          {/* VIP INVITATION 팝업 — 홈에서만 */}
          <AnimatePresence>
            {stage === 'home' && phase === 'none' && !rules && (
              <Invitation
                name={name}
                onOpen={() => setStage('verify')}
                onSafe={() => setPhase('safe')}
              />
            )}
          </AnimatePresence>

          {/* 초청 완료 위로 쏟아지는 해외결제·새 기기 로그인 알림 */}
          {stage === 'done' && alerts > 0 && phase === 'none' && <Flood count={alerts} />}
        </section>
      </div>

      {/* 피해 화면 — 결제까지 갔을 때 */}
      <AnimatePresence>
        {phase === 'damage' && <DamageScene gave={gave} onRetry={retry} />}
      </AnimatePresence>

      {/* 먼저 확인하기 — 공식 고객센터 확인 → 위험 차단 */}
      <AnimatePresence>{phase === 'safe' && <SafeScene onDone={() => setPhase('card')} />}</AnimatePresence>

      {/* 검거 완료 카드 — 위험을 막았을 때만 */}
      <AnimatePresence>
        {phase === 'card' && (
          <DefenseCard
            stats={{
              found: flags.length,
              total: flags.length,
              // 보안 대응력 — 결제까지 당한 횟수만큼 / 정보 보호력 — 넘긴 정보 개수만큼 / 악성 차단력 — 한 번도 결제 안 했으면 만점
              wrongs: falls * 2,
              misses: gave.length,
              blocked: falls > 0 ? 0 : 2,
            }}
            flags={flags}
            solved={flags.map((f) => f.target)}
            copy={vip.card}
            review={(flag) => <ReviewSite flag={flag} who={name} />}
            onNext={() => onSolved(flags.length)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>{rules && <Rules onStart={() => setRules(false)} />}</AnimatePresence>
    </div>
  )
}

/* ─────────────── 가짜 사이트 ─────────────── */

/** 통신사 홈페이지 머리 — 유틸바 + 로고 + GNB + 아이콘 (실제 KT VIP 멤버십 페이지 참고) */
function SiteHeader() {
  const s = vip.site
  return (
    <div className="shrink-0 border-b border-[#eef0f4] bg-white">
      {/* 상단 유틸바 — 기업·공공 | 소상공인 | 회사소개 */}
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
      {/* 로고 + GNB + 아이콘 */}
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
          {/* 로그인 */}
          <svg viewBox="0 0 24 24" className="h-[1.3rem] w-[1.3rem]" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {/* 검색 */}
          <svg viewBox="0 0 24 24" className="h-[1.3rem] w-[1.3rem]" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
          {/* 상담 */}
          <svg viewBox="0 0 24 24" className="hidden h-[1.3rem] w-[1.3rem] wide:block" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M4 13a8 8 0 0116 0M4 13v3a2 2 0 002 2M20 13v3a2 2 0 01-2 2h-3" strokeLinecap="round" /></svg>
          {/* 장바구니 */}
          <svg viewBox="0 0 24 24" className="h-[1.3rem] w-[1.3rem]" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M6 6h15l-1.5 9h-12z M6 6L5 3H3M9 20a1 1 0 100-2 1 1 0 000 2zM18 20a1 1 0 100-2 1 1 0 000 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {/* 햄버거 */}
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
      {/* 히어로 — 연한 복숭아·크림 그라데이션 */}
      <div className="relative overflow-hidden bg-[linear-gradient(180deg,#f6dfe0_0%,#faeede_55%,#ffffff_100%)] px-4 pt-3 pb-12 text-center">
        <div className="pointer-events-none absolute -left-10 top-8 h-48 w-48 rounded-full bg-white/40" aria-hidden="true" />
        <div className="pointer-events-none absolute right-4 top-2 h-40 w-40 rounded-full bg-white/30" aria-hidden="true" />
        {/* 브레드크럼 */}
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
        {/* VVIP 초이스 / VIP 초이스 탭 */}
        <div className="-mt-6 grid grid-cols-2 overflow-hidden rounded-lg shadow-[0_0.3rem_1rem_rgba(20,30,60,0.12)]" aria-hidden="true">
          <div className="border-2 border-[#e01a3c] bg-white py-3.5 text-center font-display text-[1.15rem] font-bold text-[#e01a3c]">{s.tabs[0]}</div>
          <div className="bg-[#7c8291] py-3.5 text-center font-display text-[1.15rem] font-bold text-white">{s.tabs[1]}</div>
        </div>

        {/* VVIP 초이스란? 표 */}
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

        {/* 각주 */}
        <ul className="mt-4 flex flex-col gap-1.5">
          {s.notes.map((n, i) => (
            <li key={i} className="flex gap-1.5 text-[0.82rem] leading-snug text-[#8a93a6]">
              <span className="shrink-0">*</span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 푸터 */}
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

/** VIP INVITATION — 검정·금색 초청장 팝업 (진짜 확인 vs 먼저 확인) */
function Invitation({ name, onOpen, onSafe }: { name: string; onOpen: () => void; onSafe: () => void }) {
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
        <p className="mt-4 font-display text-[1.35rem] leading-snug font-bold">{fill(p.hello, { name })}</p>
        <p className="mt-1.5 text-[1rem] leading-snug text-white/80">{p.selected}</p>

        {/* 콘서트 포스터 — 오리지널 그래픽(실제 포스터 사진·로고를 쓰지 않고 무대 조명+일반 실루엣으로 새로 그림) */}
        <div className="mx-auto mt-4 w-[64%] overflow-hidden rounded-lg border border-[#d8b35a]/60 shadow-[0_0.4rem_1.2rem_rgba(0,0,0,0.5)]">
          <ConcertPoster p={p} />
        </div>
        <p className="mt-2.5 inline-block rounded-full bg-[#e6c77a] px-3 py-1 font-display text-[1.05rem] font-bold text-[#2a1f08]">{p.ticketSeat}</p>
        <p className="mt-2 text-[0.85rem] text-white/70">{p.ticketDate}</p>

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
        <button
          type="button"
          data-role="vip-safe"
          onClick={onSafe}
          className="mt-2.5 w-full py-1.5 text-[0.9rem] font-semibold text-white/55 underline decoration-white/30 underline-offset-2 active:text-white"
        >
          {p.safe}
        </button>
      </motion.div>
    </motion.div>
  )
}

/**
 * 콘서트 포스터 — 전부 오리지널 그래픽입니다.
 * ★ 실제 공연 포스터의 사진·로고·디자인을 복제하지 않습니다. 무대 조명 그라데이션과
 *   특정인을 알아볼 수 없는 일반 가수 실루엣(마이크 스탠드)을 직접 그리고, 공연명은 글자로만 얹습니다.
 */
function ConcertPoster({ p }: { p: typeof vip.popup }) {
  return (
    <div className="relative aspect-[3/4] w-full bg-[radial-gradient(120%_80%_at_50%_18%,#4a74c8_0%,#243b74_45%,#0e1a3c_100%)]">
      {/* 무대 조명 빔 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-70" aria-hidden="true">
        <div className="absolute -top-6 left-1/2 h-[130%] w-16 -translate-x-1/2 rotate-[16deg] bg-[linear-gradient(180deg,rgba(255,255,255,0.55),transparent)] blur-md" />
        <div className="absolute -top-6 left-1/2 h-[130%] w-12 -translate-x-1/2 -rotate-[18deg] bg-[linear-gradient(180deg,rgba(255,255,255,0.4),transparent)] blur-md" />
      </div>
      {/* 일반 가수 실루엣(오리지널) — 마이크 스탠드 앞의 인물, 특정인 아님 */}
      <svg viewBox="0 0 120 160" className="absolute inset-x-0 bottom-0 mx-auto h-[72%]" aria-hidden="true">
        <g fill="#0a1330">
          <ellipse cx="60" cy="52" rx="15" ry="16" />
          <path d="M42 78c0-10 8-16 18-16s18 6 18 16v40c0 6-4 10-10 10H52c-6 0-10-4-10-10z" />
          <path d="M42 84l-12 30c-1 3-5 2-5-1l8-34c1-4 4-6 9-6z" />
          <path d="M78 84l10 24c1 3-2 5-4 3l-14-22z" />
        </g>
        {/* 마이크 스탠드 */}
        <g stroke="#0a1330" strokeWidth="2.4" fill="#0a1330">
          <line x1="70" y1="70" x2="82" y2="150" strokeLinecap="round" />
          <ellipse cx="69" cy="66" rx="4.5" ry="6" />
        </g>
      </svg>
      {/* 글자 — 공연명(오리지널 타이포, 실제 로고 아님) */}
      <div className="absolute inset-x-0 top-0 px-2 pt-4 text-center">
        <p className="font-display text-[0.62rem] font-bold tracking-[0.3em] text-white/90">{p.ticketTour}</p>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-2 pb-3 text-center">
        <p className="font-display text-[1.05rem] leading-none font-black tracking-tight text-white [text-shadow:0_0_0.5rem_rgba(120,170,255,0.9)]">{p.ticketTitle}</p>
        <p className="mt-1 text-[0.5rem] font-semibold tracking-wide text-white/70">{p.ticketDate}</p>
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

type Field = { id: string; label: string; value: string; gave: string }

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

function AutoField({ field, typed, onFill }: { field: Field; typed: string; onFill: () => void }) {
  return (
    <div>
      <p className="mb-1.5 text-[0.95rem] font-bold text-[#3a4256]">{field.label}</p>
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
function Verify({ name, onNext }: { name: string; onNext: () => void }) {
  const v = vip.verify
  const { typed, start, complete } = useAutoFill(v.fields, name)
  return (
    <div className="mx-auto w-full max-w-[32rem] px-5 py-5">
      <StageHead step={v.step} title={v.title} />
      <p className="mt-1.5 text-[1rem] text-[#5a6377]">{v.body}</p>
      <div className="mt-4 flex flex-col gap-3.5">
        {v.fields.map((f: Field) => (
          <AutoField key={f.id} field={f} typed={typed[f.id] ?? ''} onFill={() => start(f)} />
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
      <SiteButton role="vip-seat-next" onClick={onNext}>
        {s.cta}
      </SiteButton>
    </div>
  )
}

/** ③ 예약 보증금 결제 — 환급해 준다며 카드 정보 전부를 받습니다 */
function Pay({ onPay }: { onPay: () => void }) {
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
      <p className="mt-3 rounded-xl border border-[#e3e6ee] bg-white px-3.5 py-3 text-[0.98rem] leading-snug text-[#3a4256]">{p.notice}</p>
      <div className="mt-3 flex items-center justify-between rounded-xl bg-[#12141c] px-4 py-3 text-white">
        <span className="text-[0.95rem] text-white/70">{p.amountLabel}</span>
        <b className="font-display text-[1.5rem] text-[#e6c77a]">{p.amount}</b>
      </div>
      <div className="mt-3.5 grid grid-cols-2 gap-3">
        {p.fields.map((f: Field, i: number) => (
          <div key={f.id} className={i === 0 ? 'col-span-2' : i === 3 ? 'col-span-2' : ''}>
            <AutoField field={f} typed={typed[f.id] ?? ''} onFill={() => start(f)} />
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

/**
 * 결제까지 간 결말 — 피해 화면. "초청 완료"로 끝내지 않고, 그 뒤 무슨 일이 생기는지 보여 줍니다.
 * [다시 해보기] → 팝업으로 돌아가 다른 선택(먼저 확인하기)을 해 보게 합니다.
 */
function DamageScene({ gave, onRetry }: { gave: string[]; onRetry: () => void }) {
  const d = vip.damage
  const [shown, setShown] = useState(0)
  const total = vip.flood.alerts.length + 1
  useEffect(() => {
    if (shown >= total) return
    const id = window.setTimeout(() => setShown((n) => n + 1), shown === 0 ? 600 : 900)
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
      <div className="no-scrollbar max-h-full w-full max-w-[32rem] overflow-y-auto rounded-2xl border border-[#ff6b6b]/60 bg-[#1f0a10]/95 px-[clamp(1.1rem,4vw,1.7rem)] py-[clamp(1.1rem,3vh,1.7rem)] text-white shadow-[0_0_2.4rem_rgba(255,107,107,0.35)]">
        <div className="text-center">
          <span className="inline-block rounded-md bg-[#ff6b6b] px-2.5 py-1 font-display text-[0.85rem] leading-none font-bold text-[#2a0509]">{d.tag}</span>
          <h2 className="mt-3 font-display text-[min(1.45rem,5.6vw)] leading-snug font-bold whitespace-pre-line [text-shadow:0_0_1rem_rgba(255,107,107,0.6)]">{d.title}</h2>
        </div>

        <div className="mt-4 rounded-xl bg-[#2b3246] p-3">
          <p className="mb-2 text-center text-[0.8rem] font-bold text-white/55">{d.phone}</p>
          <div className="flex min-h-[8rem] flex-col gap-2">
            {vip.flood.alerts.slice(0, Math.min(shown, 4)).map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: -14, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                className="rounded-xl bg-white px-3.5 py-2.5 text-[#1f2430]"
              >
                <p className="text-[0.78rem] font-bold text-[#e5484d]">{a.from}</p>
                <p className="mt-0.5 text-[0.98rem] leading-snug">{a.text}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {shown >= total && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {gave.length > 0 && (
              <div className="mt-3 text-center">
                <p className="text-[0.85rem] font-bold text-white/55">{d.gaveTitle}</p>
                <div className="mt-1.5 flex flex-wrap justify-center gap-2">
                  {gave.map((g) => (
                    <span key={g} className="rounded-full border border-[#ff6b6b]/60 bg-[#2a0509] px-3 py-1.5 text-[0.95rem] font-bold text-[#ffb4b4]">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-3 text-center text-[0.98rem] leading-snug text-white/80">{d.lesson}</p>
            <button
              type="button"
              data-role="vip-retry"
              onClick={onRetry}
              className="mt-4 min-h-[3.4rem] w-full rounded-xl bg-gold px-4 font-display text-[1.2rem] font-bold text-navy-deep shadow-[0_0.3rem_0_var(--color-gold-deep)] active:translate-y-[0.15rem] active:shadow-[0_0.15rem_0_var(--color-gold-deep)]"
            >
              {d.retry}
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

/** 먼저 확인하기 — 공식 고객센터에 물어봄 → 가짜로 드러남 → 사이트 닫기·신고 → 위험 차단 */
function SafeScene({ onDone }: { onDone: () => void }) {
  const v = vip.safe
  const [shown, setShown] = useState(0)
  const total = v.chat.length + 2
  useEffect(() => {
    if (shown >= total) return
    const id = window.setTimeout(() => setShown((n) => n + 1), shown === 0 ? 700 : 1300)
    return () => window.clearTimeout(id)
  }, [shown, total])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-role="vip-safe-scene"
      className="absolute inset-0 z-40 flex items-center justify-center bg-[#050a18]/92 px-4 py-4 backdrop-blur-sm"
    >
      <div className="no-scrollbar max-h-full w-full max-w-[32rem] overflow-y-auto rounded-2xl border border-[#2fa8ff]/60 bg-[#0b1631]/95 px-[clamp(1.1rem,4vw,1.7rem)] py-[clamp(1.1rem,3vh,1.7rem)] text-white shadow-[0_0_2.4rem_rgba(47,168,255,0.35)]">
        <div className="text-center">
          <span className="inline-block rounded-md bg-gold px-2.5 py-1 font-display text-[0.85rem] leading-none font-bold text-navy-deep">{v.tag}</span>
          <h2 className="mt-3 font-display text-[min(1.45rem,5.6vw)] leading-snug font-bold whitespace-pre-line [text-shadow:0_0_1rem_rgba(47,168,255,0.6)]">{v.title}</h2>
        </div>

        {/* 고객센터 상담 */}
        <div className="mt-4 rounded-xl bg-[#e6eaf0] p-3 text-[#1f2430]">
          <p className="mb-2 flex items-center justify-center gap-1.5 text-[0.8rem] font-bold text-[#47607a]">
            <PhoneIcon />
            {v.room}
          </p>
          <div className="flex min-h-[9rem] flex-col gap-2">
            {v.chat.slice(0, shown).map((m, i) =>
              'me' in m && m.me ? (
                <motion.p key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-[82%] self-end rounded-xl rounded-br-sm bg-[#3478f6] px-3 py-2 text-[0.98rem] leading-snug text-white">
                  {m.text}
                </motion.p>
              ) : (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-[86%] self-start">
                  <p className="mb-0.5 ml-1 text-[0.78rem] font-bold text-[#47607a]">{'who' in m ? m.who : ''}</p>
                  <p className="rounded-xl rounded-bl-sm bg-white px-3 py-2 text-[0.98rem] leading-snug">{m.text}</p>
                </motion.div>
              ),
            )}
          </div>
        </div>

        {shown > v.chat.length && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex flex-wrap justify-center gap-2">
            {v.actions.map((a) => (
              <span key={a} className="inline-flex items-center gap-1.5 rounded-full border border-[#2fa8ff]/60 bg-[#050a18] px-3 py-1.5 text-[0.95rem] font-bold text-[#9fe0ff]">
                <svg viewBox="0 0 24 24" className="h-[1rem] w-[1rem]" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {a}
              </span>
            ))}
          </motion.div>
        )}

        {shown > v.chat.length + 1 && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} className="mt-4 text-center">
            <p className="font-display text-[min(1.7rem,6.4vw)] font-bold text-gold [text-shadow:0_0_1rem_rgba(254,202,54,0.5)]">{v.done}</p>
            <p className="mt-1.5 text-[0.98rem] leading-snug text-white/75">{v.doneSub}</p>
            <button type="button" data-role="vip-safe-next" onClick={onDone} className="mt-4 min-h-[3.4rem] w-full rounded-xl bg-gold px-4 font-display text-[1.2rem] font-bold text-navy-deep shadow-[0_0.3rem_0_var(--color-gold-deep)] active:translate-y-[0.15rem] active:shadow-[0_0.15rem_0_var(--color-gold-deep)]">
              {v.next}
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

/** 사건 브리핑 — 1번(연구실 메일)과 같은 상자 (체험형으로 문구만 바뀜) */
function Rules({ onStart }: { onStart: () => void }) {
  const r = vip.rules
  const icons = [<GlobeIcon key="g" />, <FormIcon key="f" />, <EyeIcon key="e" />]
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
                <Strong text={step} />
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[0.9rem] leading-snug text-white/55">{r.note}</p>
        <button
          type="button"
          data-role="rules-start"
          onClick={onStart}
          className="mt-4 min-h-[3.8rem] w-full rounded-xl bg-gold px-4 font-display text-[1.25rem] font-bold text-navy-deep shadow-[0_0.3rem_0_var(--color-gold-deep)] active:translate-y-[0.15rem] active:shadow-[0_0.15rem_0_var(--color-gold-deep)]"
        >
          {r.start}
        </button>
      </motion.div>
    </motion.div>
  )
}

/**
 * 검거 카드 뒷면 옆 '다시 보기' — 사이트의 수법 네 곳을 한 장에 모아 보여 줍니다.
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
              <span className={f.id === 'rrn' ? mark('overask') : ''}>{f.label}</span>
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
function FormIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.25rem] w-[1.25rem]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
    </svg>
  )
}
function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.25rem] w-[1.25rem]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
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
function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[0.95rem] w-[0.95rem]" fill="currentColor" aria-hidden="true">
      <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1z" />
    </svg>
  )
}
