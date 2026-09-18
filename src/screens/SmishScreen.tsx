import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChannelView } from '../channels'
import { DefenseCard } from '../components/DefenseCard'
import type { Item } from '../channels'
import { OldPhoto } from '../components/OldPhoto'
import sm from '../content/smish.json'
import { splitByFlags } from '../lib/highlight'
import { scrollToWithin } from '../lib/scroll'
import type { RedFlag, Scenario } from '../types'

/**
 * [3번 스미싱] 선택형 체험 — 문자를 주고받지 않고, 받은 문자를 보고 **무엇을 할지 고릅니다**.
 *
 *   ① 사진 확인하기  → 가짜 '사진 공유' 본인확인 페이지(이름·전화번호 → 인증번호 → 사진 보기)
 *                     → **피해 카드**(소액결제·대출·지인에게 같은 문자) → [다시 시도해 보세요] → 선택 화면으로
 *   ② 답장하기      → "지현이가 누구지?" → 범인이 질문은 얼버무리고 링크를 다시 누르게 함 → 다시 고르기
 *   ③ 누르지 않고 먼저 확인하기 → 동창회 단톡방에 물어봄 → 가짜로 드러남 → 번호 차단·신고 → 위험 차단
 *                     → [다음] → **검거 완료 카드**(1·2번 주제와 같은 카드, 뒷면 옆에 그 문자 다시 보기) → 마무리
 *
 * ★ 이 주제는 '직접 피해자가 되어 보는' 체험입니다(2026-09-18 사용자 결정).
 *   정보를 넘겨도 "전송되었습니다"로 끝내지 않고, 어떤 피해가 생기는지 보여 준 뒤 다시 고르게 합니다.
 *   위험을 막아야만 검거 카드로 갑니다. 카드 별점은 그동안 무엇을 했는지(링크 접속·넘긴 정보·당한 횟수)에서 나옵니다.
 *
 * ★ 선택지에 위험/안전 색을 입히지 않습니다. 셋 다 같은 모양 — 고르는 것이 곧 답입니다.
 * ★ 가짜 페이지에 입력한 값은 이 컴포넌트의 상태로만 있다가 사라집니다. 저장·전송하지 않습니다.
 * ★ 문자 속 미리보기 카드를 눌러도 ①과 같습니다(실제로는 그걸 누르게 되니까).
 */
type Phase = 'choose' | 'page' | 'damage' | 'verify' | 'card'

export function SmishScreen({
  scenario,
  onReply,
  onSolved,
}: {
  scenario: Scenario
  /** 안전도 증감 + 넘긴 것(당한 직후 목록에 뜹니다) */
  onReply: (delta: number, gave: string | null) => void
  /** 검거 카드까지 본 뒤 — 확인한 수법 개수를 넘깁니다(마무리 화면으로) */
  onSolved: (foundCount: number) => void
}) {
  const [phase, setPhase] = useState<Phase>('choose')
  const [replied, setReplied] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const openedOnce = useRef(false)
  /** 가짜 페이지를 끝까지 가서 당한 횟수 · 그동안 넘긴 것들 — 검거 카드 별점에 씁니다 */
  const [falls, setFalls] = useState(0)
  const [gaveList, setGaveList] = useState<string[]>([])
  const give = (delta: number, item: string) => {
    onReply(delta, item)
    setGaveList((v) => (v.includes(item) ? v : [...v, item]))
  }
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))

  const startedAt = useMemo(() => new Date(), [])
  const [items, setItems] = useState<Item[]>(() => [
    { from: 'them', text: scenario.turns[0]?.message ?? '', at: startedAt, turn: 0 },
  ])

  const openPage = () => {
    if (waiting) return
    if (!openedOnce.current) {
      openedOnce.current = true
      give(-15, sm.page.gaveOpen)
    }
    setPhase('page')
  }

  const reply = () => {
    if (replied || waiting) return
    setWaiting(true)
    setItems((prev) => [...prev, { from: 'me', text: sm.myReply, at: new Date() }])
    later(() => {
      setItems((prev) => [...prev, { from: 'them', text: scenario.turns[1]?.message ?? '', at: new Date(), turn: 1 }])
      setReplied(true)
      setWaiting(false)
    }, 1700)
  }

  return (
    <div className="relative flex h-full w-full flex-col px-4 pt-[max(0.9rem,2vh)] pb-4 wide:flex-row wide:items-stretch wide:gap-[3%] wide:px-[4%] wide:py-6">
      {/* 받은 문자 — 휴대폰 문자 앱 그대로 */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl shadow-[0_0.6rem_2rem_rgba(0,0,0,0.35)] wide:min-w-0">
        <ChannelView
          scenario={scenario}
          items={items}
          typing={waiting}
          readIndex={replied ? 1 : -1}
          render={(t) => t}
          onPreview={openPage}
        />
      </div>

      {/* 선택지 */}
      <div className="shrink-0 pt-3.5 wide:flex wide:w-[min(27rem,38%)] wide:flex-col wide:justify-center wide:pt-0">
        <p className="text-center font-display text-[min(1.5rem,6vw)] leading-tight font-bold text-white [text-shadow:0_0_1rem_rgba(47,168,255,0.6)] wide:text-left wide:text-[1.8rem]">
          {sm.ask}
        </p>
        <p className="mt-1 text-center text-[0.98rem] text-white/60 wide:text-left">{sm.askSub}</p>

        <div className="mt-3 flex flex-col gap-2.5 wide:mt-5">
          <Choice no={1} role="smish-open" label={sm.options.open.label} sub={sm.options.open.sub} disabled={waiting} onClick={openPage} />
          {!replied && (
            <Choice no={2} role="smish-reply" label={sm.options.reply.label} sub={`"${sm.myReply}"`} disabled={waiting} onClick={reply} />
          )}
          <Choice
            no={replied ? 2 : 3}
            role="smish-verify"
            label={sm.options.verify.label}
            sub={sm.options.verify.sub}
            disabled={waiting}
            onClick={() => setPhase('verify')}
          />
        </div>
      </div>

      <AnimatePresence>
        {phase === 'page' && (
          <FakePage
            onClose={() => setPhase('choose')}
            onGive={give}
            onDone={() => {
              setFalls((n) => n + 1)
              setPhase('damage')
            }}
          />
        )}
        {phase === 'damage' && <DamageScene gave={gaveList} onRetry={() => setPhase('choose')} />}
        {phase === 'verify' && <VerifyScene onDone={() => setPhase('card')} />}
        {phase === 'card' && (
          <DefenseCard
            stats={{
              found: scenario.redFlags.length,
              total: scenario.redFlags.length,
              // 보안 대응력 — 끝까지 당한 횟수만큼 / 정보 보호력 — 넘긴 것 개수만큼 / 악성 차단력 — 링크를 안 눌렀으면 만점
              wrongs: falls * 2,
              misses: gaveList.length,
              blocked: falls > 0 ? 0 : openedOnce.current ? 1 : 2,
            }}
            flags={scenario.redFlags}
            solved={scenario.redFlags.map((f) => f.target)}
            copy={sm.card}
            review={(flag) => <ReviewThread scenario={scenario} flag={flag} />}
            onNext={() => onSolved(scenario.redFlags.length)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/** 검거 카드 뒷면 옆 — 그 문자를 다시 보여 주고, 카드가 가리키는 수법의 자리를 붉게 빛냅니다(답장 뒤 범인의 문자까지 전부) */
function ReviewThread({ scenario, flag }: { scenario: Scenario; flag: RedFlag }) {
  const at = useMemo(() => new Date(), [])
  const items: Item[] = [
    { from: 'them', text: scenario.turns[0]?.message ?? '', at, turn: 0 },
    { from: 'me', text: sm.myReply, at },
    { from: 'them', text: scenario.turns[1]?.message ?? '', at, turn: 1 },
  ]
  const render = (text: string) =>
    splitByFlags(text, scenario.redFlags).map((seg, i) =>
      seg.flag ? (
        <span
          key={i}
          className={
            seg.flag.target === flag.target
              ? 'focus-glow rounded px-0.5 font-bold text-red-700'
              : 'rounded bg-red-50 px-0.5 text-red-700 underline decoration-red-300 decoration-2'
          }
        >
          {seg.text}
        </span>
      ) : (
        <span key={i}>{seg.text}</span>
      ),
    )
  // 문자 앱은 자기 안에서 스크롤합니다 — 카드가 가리키는 수법이 바뀌면 그 자리로 직접 내려 줍니다
  // (검거 카드가 오른쪽 판에 zoom 0.82 를 걸어 두어 좌표를 그만큼 환산)
  const wrap = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const id = window.setTimeout(() => {
      const el = wrap.current?.querySelector('.focus-glow') ?? null
      scrollToWithin((el?.closest('.overflow-y-auto') as HTMLElement | null) ?? null, el, 0.82)
    }, 650)
    return () => window.clearTimeout(id)
  }, [flag.target])
  return (
    <div ref={wrap} className="h-full">
      <ChannelView scenario={scenario} items={items} typing={false} readIndex={-1} render={render} />
    </div>
  )
}

/**
 * ① 의 결말 — 피해 카드. "정보가 전송되었습니다"로 끝내지 않고, 그 뒤 실제로 무슨 일이 생기는지 보여 줍니다.
 * [다시 시도해 보세요] → 선택 화면으로 돌아가 다른 선택을 해 보게 합니다.
 */
function DamageScene({ gave, onRetry }: { gave: string[]; onRetry: () => void }) {
  const d = sm.damage
  const [shown, setShown] = useState(0)
  const total = d.alerts.length + 1
  useEffect(() => {
    if (shown >= total) return
    const id = window.setTimeout(() => setShown((n) => n + 1), shown === 0 ? 700 : 1200)
    return () => window.clearTimeout(id)
  }, [shown, total])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-role="smish-damage"
      className="absolute inset-0 z-40 flex items-center justify-center bg-[#1a0508]/92 px-4 py-4 backdrop-blur-sm"
    >
      <div className="no-scrollbar max-h-full w-full max-w-[32rem] overflow-y-auto rounded-2xl border border-[#ff6b6b]/60 bg-[#1f0a10]/95 px-[clamp(1.1rem,4vw,1.7rem)] py-[clamp(1.1rem,3vh,1.7rem)] text-white shadow-[0_0_2.4rem_rgba(255,107,107,0.35)]">
        <div className="text-center">
          <span className="inline-block rounded-md bg-[#ff6b6b] px-2.5 py-1 font-display text-[0.85rem] leading-none font-bold text-[#2a0509]">{d.tag}</span>
          <h2 className="mt-3 font-display text-[min(1.45rem,5.6vw)] leading-snug font-bold whitespace-pre-line [text-shadow:0_0_1rem_rgba(255,107,107,0.6)]">{d.title}</h2>
        </div>

        {/* 그 뒤 내 휴대폰에 온 알림들 */}
        <div className="mt-4 rounded-xl bg-[#2b3246] p-3">
          <p className="mb-2 text-center text-[0.8rem] font-bold text-white/55">{d.phone}</p>
          <div className="flex min-h-[9.5rem] flex-col gap-2">
            {d.alerts.slice(0, shown).map((a, i) => (
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
              data-role="smish-retry"
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

/** 선택지 한 줄 — 셋 다 같은 모양(위험·안전 색 없음) */
function Choice({
  no,
  role,
  label,
  sub,
  disabled,
  onClick,
}: {
  no: number
  role: string
  label: string
  sub: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      data-role={role}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.985 }}
      className="flex w-full items-center gap-3 rounded-2xl border border-[#2fa8ff]/45 bg-[#0b1631]/90 px-4 py-3 text-left shadow-[0_0_1.2rem_rgba(47,168,255,0.12)] transition-colors active:border-gold active:bg-[#12224a] disabled:opacity-45"
    >
      <span className="flex h-[2.4rem] w-[2.4rem] shrink-0 items-center justify-center rounded-xl border border-[#2fa8ff]/50 bg-[#050a18] font-display text-[1.1rem] font-bold text-[#9fe0ff]">
        {no}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[1.2rem] leading-tight font-bold text-white">{label}</span>
        <span className="mt-0.5 block text-[0.92rem] leading-snug text-white/60">{sub}</span>
      </span>
      <svg viewBox="0 0 26 26" className="h-[1.3rem] w-[1.3rem] shrink-0 text-gold" aria-hidden="true">
        <path d="M4 13h16M14 6l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </motion.button>
  )
}

/**
 * ① 가짜 '사진 공유' 본인확인 페이지.
 * 이름·전화번호 → [인증번호 전송] → "전송했습니다" 팝업 → (가짜 인증 문자가 위에서 내려옴) → 인증번호 → [인증하기] → [본인 확인 후 사진 보기]
 * ★ 입력값은 이 컴포넌트 안에서만 쓰고 버립니다.
 */
function FakePage({
  onClose,
  onGive,
  onDone,
}: {
  onClose: () => void
  onGive: (delta: number, item: string) => void
  onDone: () => void
}) {
  const p = sm.page
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [popup, setPopup] = useState(false)
  const [sent, setSent] = useState(false)
  const [banner, setBanner] = useState(false)
  const [verified, setVerified] = useState(false)
  const [loading, setLoading] = useState(false)
  const gaveInfo = useRef(false)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))

  const canSend = name.trim().length > 0 && phone.replace(/\D/g, '').length >= 4
  const canVerify = sent && code.replace(/\D/g, '').length >= 4

  const send = () => {
    if (!canSend) return
    if (!gaveInfo.current) {
      gaveInfo.current = true
      onGive(-40, p.gaveInfo)
    }
    setPopup(true)
  }
  const closePopup = () => {
    setPopup(false)
    setSent(true)
    later(() => setBanner(true), 900)
    later(() => setBanner(false), 9000)
  }
  const verify = () => {
    if (!canVerify || verified) return
    onGive(-45, p.gaveCode)
    setVerified(true)
  }
  const view = () => {
    if (!verified || loading) return
    setLoading(true)
    later(onDone, 1500)
  }

  const field =
    'w-full rounded-xl border border-[#d5dae3] bg-white px-4 py-3 text-[1.05rem] text-[#1f2430] outline-none placeholder:text-[#a3abb8] focus:border-[#3478f6]'

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      data-role="smish-page"
      className="absolute inset-0 z-40 flex flex-col bg-[#f4f6fa] text-[#1f2430]"
    >
      {/* 브라우저 윗줄 */}
      <div className="flex shrink-0 items-center gap-2.5 border-b border-[#e3e7ee] bg-white px-3 py-2.5">
        <button type="button" data-role="smish-page-close" onClick={onClose} aria-label={p.close} className="flex h-[2.2rem] w-[2.2rem] items-center justify-center rounded-full text-[#5f6b80] active:bg-[#eef1f6]">
          <svg viewBox="0 0 24 24" className="h-[1.2rem] w-[1.2rem]" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-[#eef1f6] px-3.5 py-2 text-[0.95rem] text-[#5f6b80]">
          <svg viewBox="0 0 24 24" className="h-[0.95rem] w-[0.95rem] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 017.5-2" strokeLinecap="round" />
          </svg>
          <span className="truncate">{p.address}</span>
        </div>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[30rem] px-5 py-5">
          <p className="text-center text-[0.95rem] font-bold text-[#3478f6]">{p.site}</p>

          {/* 공유한 사람 + 잠긴 사진 3장 */}
          <div className="mt-3 rounded-2xl bg-white p-4 shadow-[0_0.2rem_0.8rem_rgba(20,30,60,0.08)]">
            <div className="flex items-center gap-3">
              <span className="flex h-[2.8rem] w-[2.8rem] shrink-0 items-center justify-center rounded-full bg-[#e3ebff] text-[1.1rem] font-bold text-[#2f55b8]">김</span>
              <p className="text-[1.08rem] leading-snug font-bold">{p.shared}</p>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {([0, 1, 2] as const).map((v) => (
                <div key={v} className="relative aspect-square overflow-hidden rounded-xl">
                  <OldPhoto variant={v} className={`h-full w-full ${loading ? '' : 'scale-110 blur-[7px]'} transition-[filter] duration-700`} />
                  {!loading && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/15 text-white">
                      <svg viewBox="0 0 24 24" className="h-[1.6rem] w-[1.6rem]" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                        <rect x="5" y="11" width="14" height="9" rx="2" />
                        <path d="M8 11V8a4 4 0 018 0v3" />
                      </svg>
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-[0.98rem] leading-snug text-[#5f6b80]">{p.notice}</p>
          </div>

          {/* 본인 확인 */}
          <div className="mt-4 flex flex-col gap-3">
            <label className="block">
              <span className="mb-1.5 block text-[0.92rem] font-bold text-[#3a4250]">{p.name}</span>
              <input data-role="smish-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={12} placeholder={p.namePh} autoComplete="off" className={field} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[0.92rem] font-bold text-[#3a4250]">{p.phone}</span>
              <span className="flex gap-2">
                <input data-role="smish-phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={13} inputMode="numeric" placeholder={p.phonePh} autoComplete="off" className={`${field} min-w-0 flex-1`} />
                <button type="button" data-role="smish-send" onClick={send} disabled={!canSend} className="shrink-0 rounded-xl bg-[#3478f6] px-4 text-[0.98rem] font-bold whitespace-nowrap text-white active:bg-[#2563d9] disabled:opacity-40">
                  {sent ? p.resend : p.send}
                </button>
              </span>
            </label>

            {sent && (
              <motion.label initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="block">
                <span className="mb-1.5 block text-[0.92rem] font-bold text-[#3a4250]">{p.code}</span>
                <span className="flex gap-2">
                  <input data-role="smish-code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} inputMode="numeric" placeholder={p.codePh} autoComplete="off" disabled={verified} className={`${field} min-w-0 flex-1 disabled:bg-[#eef1f6]`} />
                  <button type="button" data-role="smish-verify-code" onClick={verify} disabled={!canVerify || verified} className="shrink-0 rounded-xl bg-[#3478f6] px-4 text-[0.98rem] font-bold whitespace-nowrap text-white active:bg-[#2563d9] disabled:opacity-40">
                    {verified ? p.verified : p.verify}
                  </button>
                </span>
              </motion.label>
            )}

            <button type="button" data-role="smish-view" onClick={view} disabled={!verified || loading} className="mt-1 min-h-[3.4rem] w-full rounded-xl bg-[#1f2a44] px-4 text-[1.1rem] font-bold text-white active:bg-[#151d31] disabled:opacity-35">
              {loading ? p.loading : p.view}
            </button>
          </div>
        </div>
      </div>

      {/* 가짜 인증 문자 — 위에서 내려옵니다(이 숫자를 그대로 넘겨주게 되는 장면) */}
      <AnimatePresence>
        {banner && (
          <motion.div
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -60 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            data-role="smish-sms-banner"
            className="pointer-events-none absolute inset-x-3 top-3 z-50 mx-auto max-w-[30rem] rounded-2xl bg-white/97 px-4 py-3 shadow-[0_0.6rem_2rem_rgba(0,0,0,0.3)]"
          >
            <p className="text-[0.8rem] font-bold text-[#3478f6]">{p.sms.app} · {p.sms.from}</p>
            <p className="mt-0.5 text-[1.02rem] leading-snug text-[#1f2430]">{p.sms.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* "전송했습니다" 팝업 */}
      <AnimatePresence>
        {popup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex items-center justify-center bg-black/45 px-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} role="alertdialog" className="w-full max-w-[22rem] rounded-2xl bg-white p-5 text-center shadow-xl">
              <p className="text-[1.1rem] leading-snug font-bold whitespace-pre-line text-[#1f2430]">{p.sentPopup}</p>
              <button type="button" data-role="smish-popup-ok" onClick={closePopup} className="mt-4 min-h-[3rem] w-full rounded-xl bg-[#3478f6] text-[1.05rem] font-bold text-white active:bg-[#2563d9]">
                {p.ok}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/** ③ 누르지 않고 먼저 확인하기 — 단톡방에 물어봄 → 가짜로 드러남 → 차단·신고 → 위험 차단 */
function VerifyScene({ onDone }: { onDone: () => void }) {
  const v = sm.verify
  const [shown, setShown] = useState(0)
  const total = v.chat.length + 2 // 대화 + 조치 + 완료
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
      data-role="smish-verify-scene"
      className="absolute inset-0 z-40 flex items-center justify-center bg-[#050a18]/92 px-4 py-4 backdrop-blur-sm"
    >
      <div className="no-scrollbar max-h-full w-full max-w-[32rem] overflow-y-auto rounded-2xl border border-[#2fa8ff]/60 bg-[#0b1631]/95 px-[clamp(1.1rem,4vw,1.7rem)] py-[clamp(1.1rem,3vh,1.7rem)] text-white shadow-[0_0_2.4rem_rgba(47,168,255,0.35)]">
        <div className="text-center">
          <span className="inline-block rounded-md bg-gold px-2.5 py-1 font-display text-[0.85rem] leading-none font-bold text-navy-deep">{v.tag}</span>
          <h2 className="mt-3 font-display text-[min(1.45rem,5.6vw)] leading-snug font-bold whitespace-pre-line [text-shadow:0_0_1rem_rgba(47,168,255,0.6)]">{v.title}</h2>
        </div>

        {/* 단톡방 */}
        <div className="mt-4 rounded-xl bg-[#b2c7d9] p-3 text-[#1f2430]">
          <p className="mb-2 text-center text-[0.8rem] font-bold text-[#47607a]">{v.room}</p>
          <div className="flex min-h-[9rem] flex-col gap-2">
            {v.chat.slice(0, shown).map((m, i) =>
              'me' in m && m.me ? (
                <motion.p key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-[82%] self-end rounded-xl rounded-br-sm bg-[#fee500] px-3 py-2 text-[0.98rem] leading-snug">
                  {m.text}
                </motion.p>
              ) : (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-[82%] self-start">
                  <p className="mb-0.5 ml-1 text-[0.78rem] font-bold text-[#47607a]">{'who' in m ? m.who : ''}</p>
                  <p className="rounded-xl rounded-bl-sm bg-white px-3 py-2 text-[0.98rem] leading-snug">{m.text}</p>
                </motion.div>
              ),
            )}
          </div>
        </div>

        {/* 조치 */}
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

        {/* 완료 */}
        {shown > v.chat.length + 1 && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} className="mt-4 text-center">
            <p className="font-display text-[min(1.7rem,6.4vw)] font-bold text-gold [text-shadow:0_0_1rem_rgba(254,202,54,0.5)]">{v.done}</p>
            <p className="mt-1.5 text-[0.98rem] leading-snug text-white/75">{v.doneSub}</p>
            <button type="button" data-role="smish-verify-next" onClick={onDone} className="mt-4 min-h-[3.4rem] w-full rounded-xl bg-gold px-4 font-display text-[1.2rem] font-bold text-navy-deep shadow-[0_0.3rem_0_var(--color-gold-deep)] active:translate-y-[0.15rem] active:shadow-[0_0.15rem_0_var(--color-gold-deep)]">
              {v.next}
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
