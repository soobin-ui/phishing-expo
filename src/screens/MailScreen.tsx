import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EmailBody } from '../channels/MailView'
import { TapButton } from '../components/Buttons'
import { DefenseCard } from '../components/DefenseCard'
import { splitByFlags } from '../lib/highlight'
import { fill, ui } from '../lib/content'
import type { MailDoc, RedFlag, Scenario } from '../types'

/**
 * [메일] 연구실·산학협력 — **피싱 전문 수사관** 모드.
 *
 * 브리핑 → 받은편지함 → 새로 온 메일을 열어 수상한 곳 4군데를 조사 → 잡았다 카드.
 *
 * ★ 돋보기(조사 기회)에 개수 제한이 있습니다.
 *   제한이 없으면 "전부 눌러보면 성공"하는 다 눌러보기 게임이 됩니다.
 *   맞든 틀리든 한 번 누를 때마다 하나씩 닳으므로, 눈으로 먼저 읽게 됩니다.
 *
 * ★ 수상한 곳을 찾으면 바로 옆에 말풍선이 떠서 '어떻게 조사할지' 고르게 합니다.
 *   찾는 것으로 끝내면 "빨간 줄 누르기"가 되고 실제로 뭘 해야 하는지는 안 남습니다.
 *   틀린 방법을 고르면 왜 안 되는지 알려주고 다시 고르게 합니다(벌점 없음).
 *
 * 다른 네 주제(문자·메신저·전화)는 직접 당해보는 방식입니다. 메일만 이 방식입니다.
 */
type View = 'brief' | 'inbox' | 'mail'
type Pop = { flag: RedFlag; x: number; y: number; below: boolean; wrong: number | null }

const PHISH = '__phish__'
/** 돋보기 개수 — 찾을 곳 4곳 + 헛짚을 여유 2번 */
const TOOLS = 6

export function MailScreen({
  scenario,
  onReply,
  onSolved,
}: {
  scenario: Scenario
  /** 놓친 곳만큼 안전도를 깎습니다(마지막 등급에 반영) */
  onReply: (delta: number, gave: string | null) => void
  onSolved: (foundCount: number) => void
}) {
  const t = ui.investigate
  const c = ui.channels.mail
  const flags = scenario.redFlags
  const total = flags.length

  const [view, setView] = useState<View>('brief')
  const [solved, setSolved] = useState<string[]>([])
  const [used, setUsed] = useState(0)
  const [pop, setPop] = useState<Pop | null>(null)
  const [miss, setMiss] = useState(false)
  const [misses, setMisses] = useState(0)
  const [wrongs, setWrongs] = useState(0)
  const [toast, setToast] = useState('')
  const [card, setCard] = useState(false)
  /** 돋보기를 쓴 자리에서 잠깐 떠오르는 '남은 개수' */
  const [popCount, setPopCount] = useState<{ id: number; x: number; y: number; n: number } | null>(null)
  const paneRef = useRef<HTMLElement>(null)
  const done = useRef(false)

  const left = TOOLS - used
  const decoys = scenario.inbox ?? []
  const mails: Array<{ id: string; doc: MailDoc; phish: boolean }> = [
    { id: PHISH, doc: scenario, phish: true },
    ...decoys.map((d, i) => ({ id: d.id ?? `d${i}`, doc: d, phish: false })),
  ]

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 1800)
  }

  /** 조사 끝 — 다 잡았거나 돋보기가 떨어졌거나 */
  const finish = (foundCount: number) => {
    if (done.current) return
    done.current = true
    onReply(-15 * (total - foundCount), null)
    setCard(true)
  }

  /** 돋보기 한 개 쓰기 — 누른 자리에 남은 개수를 띄웁니다 */
  const spend = (e?: { clientX: number; clientY: number }): number => {
    const next = used + 1
    setUsed(next)
    const remain = TOOLS - next
    const pane = paneRef.current?.getBoundingClientRect()
    if (e && pane) {
      setPopCount({ id: Date.now(), x: e.clientX - pane.left, y: e.clientY - pane.top, n: remain })
      window.setTimeout(() => setPopCount(null), 1150)
    }
    return remain
  }

  /** 수상한 곳을 눌렀을 때 — 그 자리 옆에 말풍선 */
  const tapFlag = (flag: RedFlag, el: HTMLElement, at?: { clientX: number; clientY: number }) => {
    if (pop || card || solved.includes(flag.target)) return
    const pane = paneRef.current?.getBoundingClientRect()
    if (!pane) return
    const r = el.getBoundingClientRect()
    spend(at ?? { clientX: r.left + r.width / 2, clientY: r.top })
    const bottom = r.bottom - pane.top
    const below = bottom + 240 < pane.height
    setPop({
      flag,
      x: r.left - pane.left,
      y: below ? bottom + 8 : r.top - pane.top - 8,
      below,
      wrong: null,
    })
  }

  /** 수상하지 않은 곳을 눌렀을 때 — 돋보기만 닳습니다 */
  const tapMiss = (at?: { clientX: number; clientY: number }) => {
    if (pop || card) return
    const remain = spend(at)
    setMisses((m) => m + 1)
    setMiss(true)
    window.setTimeout(() => setMiss(false), 700)
    showToast(remain === 1 ? t.lastOne : t.miss)
    if (remain <= 0) window.setTimeout(() => finish(solved.length), 700)
  }

  /** 말풍선에서 조사 방법을 골랐을 때 */
  const choose = (i: number) => {
    if (!pop?.flag.probe) return
    if (!pop.flag.probe.options[i].ok) {
      setWrongs((w) => w + 1)
      setPop({ ...pop, wrong: i })
      return
    }
    const next = [...solved, pop.flag.target]
    setSolved(next)
    setPop(null)
    if (next.length >= total || left <= 0) window.setTimeout(() => finish(next.length), 500)
  }

  /** 메일 글자를 '누를 수 있는 조각'으로 */
  const render = (text: string) =>
    splitByFlags(text, flags).map((seg, i) =>
      seg.flag ? (
        <span
          key={i}
          onClick={(e) => tapFlag(seg.flag!, e.currentTarget, e)}
          className={`cursor-pointer rounded px-0.5 ${
            solved.includes(seg.flag.target)
              ? 'bg-red-100 font-bold text-red-700 underline decoration-red-400 decoration-2'
              : ''
          }`}
        >
          {seg.text}
        </span>
      ) : (
        <span key={i} onClick={(e) => tapMiss(e)}>
          {seg.text}
        </span>
      ),
    )

  const flagOf = (target: string) => flags.find((f) => f.target === target)
  const linkFlag = flagOf('link')
  const fileFlag = flagOf('attachment')

  /* ── 브리핑 ── */
  if (view === 'brief') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[34rem]"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-1.5 font-display text-[0.95rem] font-bold text-navy-deep">
            <Magnifier className="h-[1rem] w-[1rem]" />
            {t.badge}
          </span>
          <h1 className="mt-6 font-display text-[min(2.1rem,7.5vw)] leading-snug font-bold text-white">
            {t.briefTitle}
          </h1>
          <p className="mt-4 text-[1.2rem] leading-relaxed whitespace-pre-line text-white/75">
            {t.briefBody}
          </p>

          <div className="mt-8 rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-4 text-left">
            <p className="flex items-center gap-2 font-display text-[1.1rem] font-bold text-gold">
              <Magnifier className="h-[1.1rem] w-[1.1rem]" />
              {fill(t.toolTitle, { n: TOOLS })}
            </p>
            <p className="mt-2 text-[1rem] leading-snug whitespace-pre-line text-white/70">
              {t.toolBody}
            </p>
          </div>

          <div className="mt-7">
            <TapButton onClick={() => setView('inbox')}>{t.start}</TapButton>
          </div>
        </motion.div>
      </div>
    )
  }

  /* ── 받은편지함 / 메일 조사 ── */
  return (
    <div className="flex h-full w-full flex-col">
      <header className="shrink-0 px-5 pt-[max(0.9rem,2vh)] pb-3">
        <div className="mx-auto flex w-full max-w-[62rem] items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.95rem] font-semibold text-sky">
              {fill(t.goal, { n: total })}
            </p>
            <p className="mt-0.5 text-[0.85rem] text-white/45 tabular-nums">
              {fill(t.progress, { found: solved.length, total })}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1" aria-label={fill(t.left, { n: left })}>
            {Array.from({ length: TOOLS }, (_, i) => (
              <Magnifier
                key={i}
                className={`h-[1.3rem] w-[1.3rem] ${i < left ? 'text-gold' : 'text-white/15'}`}
              />
            ))}
          </div>
        </div>
      </header>

      <motion.section
        ref={paneRef}
        animate={miss ? { x: [0, -7, 7, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.45 }}
        className={`relative mx-auto min-h-0 w-full min-w-0 flex-1 overflow-hidden rounded-t-2xl bg-white wide:mb-4 wide:max-w-[62rem] wide:rounded-2xl ${
          view === 'mail' && !card ? 'cursor-magnify' : ''
        }`}
      >
        {view === 'inbox' ? (
          <Inbox
            mails={mails}
            title={c.inbox}
            hint={c.arrive.openHint}
            onOpen={(id) => (id === PHISH ? setView('mail') : showToast(t.openDecoy))}
          />
        ) : (
          <div className="flex h-full min-h-0 flex-col text-[#1f2430]">
            <div className="flex shrink-0 items-center gap-4 border-b border-[#eceff4] px-4 py-3 text-[0.95rem] text-[#5f6b80]">
              <button
                type="button"
                data-role="to-inbox"
                onClick={() => setView('inbox')}
                className="rounded-lg px-1 py-1 active:bg-[#f1f4f9]"
              >
                ‹ {c.inbox}
              </button>
            </div>
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="mx-auto w-full max-w-[50rem] px-4 py-4">
                <EmailBody
                  mail={scenario}
                  render={render}
                  onLink={(el, e) => linkFlag && tapFlag(linkFlag, el, e)}
                  onAttachment={(el, e) => fileFlag && tapFlag(fileFlag, el, e)}
                  solvedLink={!!linkFlag && solved.includes(linkFlag.target)}
                  solvedFile={!!fileFlag && solved.includes(fileFlag.target)}
                />
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {pop && <Bubble pop={pop} onPick={choose} onRetry={() => setPop({ ...pop, wrong: null })} />}
        </AnimatePresence>

        <AnimatePresence>
          {card && (
            <DefenseCard
              stats={{
                found: solved.length,
                total,
                wrongs,
                misses,
                blocked:
                  (linkFlag && solved.includes(linkFlag.target) ? 1 : 0) +
                  (fileFlag && solved.includes(fileFlag.target) ? 1 : 0),
              }}
              flags={flags}
              solved={solved}
              onNext={() => onSolved(solved.length)}
            />
          )}
        </AnimatePresence>

        {popCount && (
          <span
            key={popCount.id}
            className="tool-pop pointer-events-none absolute z-40 flex items-center gap-1 rounded-full bg-[#1f2430]/95 px-2.5 py-1 text-[0.85rem] font-bold whitespace-nowrap text-white"
            style={{ left: popCount.x, top: popCount.y }}
          >
            <Magnifier className="h-[0.85rem] w-[0.85rem] text-gold" />
            {fill(t.spent, { n: popCount.n })}
          </span>
        )}

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
    </div>
  )
}

/** 어떻게 조사할까요? — 찾은 자리 바로 옆 말풍선 */
function Bubble({
  pop,
  onPick,
  onRetry,
}: {
  pop: Pop
  onPick: (i: number) => void
  onRetry: () => void
}) {
  const t = ui.investigate
  const probe = pop.flag.probe
  if (!probe) return null
  const wrong = pop.wrong === null ? null : probe.options[pop.wrong]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      data-role="probe"
      className="absolute z-40 w-[min(23rem,calc(100%-1.5rem))]"
      style={{
        left: `clamp(0.75rem, ${pop.x}px, calc(100% - min(23rem, 100% - 1.5rem) - 0.75rem))`,
        top: pop.below ? pop.y : undefined,
        bottom: pop.below ? undefined : `calc(100% - ${pop.y}px)`,
      }}
    >
      <div className="rounded-2xl bg-navy-deep p-4 text-white shadow-[0_0.8rem_2rem_rgba(0,0,0,0.35)]">
        <p className="flex items-start gap-2 text-[1.02rem] leading-snug font-bold">
          <span className="mt-0.5 shrink-0 rounded-md bg-gold px-1.5 py-0.5 text-[0.7rem] font-extrabold text-navy-deep">
            발견
          </span>
          {pop.flag.label}
        </p>

        {wrong ? (
          <>
            <p className="mt-3 text-[0.95rem] font-bold text-[#fca5a5]">{t.wrong}</p>
            <p className="mt-1.5 text-[0.98rem] leading-relaxed text-white/80">{wrong.why}</p>
            <button
              type="button"
              data-role="probe-retry"
              onClick={onRetry}
              className="mt-3 w-full rounded-xl bg-white/12 px-4 py-2.5 text-[0.98rem] font-bold text-white active:bg-white/20"
            >
              {t.retry}
            </button>
          </>
        ) : (
          <>
            <p className="mt-2.5 text-[0.92rem] font-semibold text-sky">{probe.question}</p>
            <div className="mt-2 flex flex-col gap-1.5">
              {probe.options.map((o, i) => (
                <button
                  key={i}
                  type="button"
                  data-role={o.ok ? 'probe-ok' : 'probe-no'}
                  onClick={() => onPick(i)}
                  className="rounded-xl bg-white/10 px-3.5 py-2.5 text-left text-[0.98rem] leading-snug font-semibold text-white active:bg-white/20"
                >
                  {o.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}

/** 받은편지함 목록 */
function Inbox({
  mails,
  title,
  hint,
  onOpen,
}: {
  mails: Array<{ id: string; doc: MailDoc; phish: boolean }>
  title: string
  hint: string
  onOpen: (id: string) => void
}) {
  return (
    <div className="flex h-full min-h-0 flex-col text-[#1f2430]">
      <div className="flex shrink-0 items-center gap-2 border-b border-[#eceff4] px-5 py-3.5">
        <span className="font-display text-[1.2rem] font-bold text-navy">{title}</span>
        <span className="rounded-full bg-[#2f6be0] px-2 py-0.5 text-[0.78rem] font-bold text-white">1</span>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[44rem]">
          {mails.map((m) => (
            <motion.button
              key={m.id}
              type="button"
              data-role={m.phish ? 'open-phish' : 'open-decoy'}
              onClick={() => onOpen(m.id)}
              animate={
                m.phish
                  ? {
                      scale: [1, 1.012, 1],
                      backgroundColor: [
                        'rgba(47,107,224,0)',
                        'rgba(47,107,224,0.07)',
                        'rgba(47,107,224,0)',
                      ],
                    }
                  : undefined
              }
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              className={`flex w-full items-start gap-3 border-b border-[#f2f4f8] px-5 py-4 text-left active:bg-[#eef4ff] ${
                m.phish ? '' : 'opacity-55'
              }`}
            >
              <span
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                  m.phish ? 'bg-[#2f6be0]' : 'bg-transparent'
                }`}
              />
              <span className="flex h-[2.4rem] w-[2.4rem] shrink-0 items-center justify-center rounded-full bg-[#e9edf3] text-[0.9rem] font-bold text-[#5f6b80]">
                {m.doc.sender.name.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex justify-between text-[1rem]">
                  <span className={`truncate ${m.phish ? 'font-bold text-[#1f2430]' : 'text-[#6b7280]'}`}>
                    {m.doc.sender.name}
                  </span>
                  <span className="shrink-0 pl-2 text-[0.82rem] text-[#9aa1ad]">{m.doc.time}</span>
                </span>
                <span
                  className={`block truncate text-[1.02rem] ${m.phish ? 'font-semibold' : 'text-[#8a93a5]'}`}
                >
                  {m.doc.subject}
                </span>
                <span className="mt-0.5 block truncate text-[0.92rem] text-[#9aa1ad]">
                  {(m.doc.body ?? '').split('\n')[0]}
                </span>
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      <p className="shrink-0 border-t border-[#eceff4] bg-[#f7f9fc] px-4 py-3 text-center text-[0.95rem] font-semibold text-[#2f6be0]">
        {hint}
      </p>
    </div>
  )
}

function Magnifier({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden="true"
    >
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L21 21" strokeLinecap="round" />
    </svg>
  )
}


