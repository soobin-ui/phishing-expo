import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { EmailBody } from '../channels/MailView'
import { SafetyGauge } from '../components/Buttons'
import { situations, ui } from '../lib/content'
import type { MailDoc, Scenario } from '../types'

/**
 * [메일] 연구실·산학협력 — 받은편지함을 열어 오늘 온 메일을 처리합니다.
 *
 * ★ 보기를 주지 않습니다.
 *   "①첨부 열기 ②신고하기" 처럼 늘어놓으면 답을 알려주는 꼴이라, 실제 메일 앱처럼
 *   본문의 파란 버튼·첨부파일·도구막대(답장·전달·삭제·신고)만 놓아둡니다.
 *   손이 먼저 어디로 가는지가 그대로 답입니다.
 *
 * ★ 평범한 업무 메일 2통을 같이 놓습니다(scenario.inbox).
 *   "체험존이니까 이건 피싱이겠지"를 깨고, 진짜 메일에도 링크가 있다는 걸 보여줍니다.
 *   진짜 메일은 무엇을 하든 벌점이 없습니다. 신고해도 "정상 메일이었습니다"로 끝.
 *
 * ★ 피싱 메일에 손을 대는 순간 체험이 갈립니다.
 *   링크→가짜 로그인, 첨부→실행 확인, 답장·전달은 당함 / 삭제·신고는 방어 성공.
 */
type View = { kind: 'inbox' } | { kind: 'mail'; id: string }
type Sub = 'none' | 'login' | 'install'

const PHISH = '__phish__'

export function MailScreen({
  scenario,
  safety,
  onReply,
  onFinish,
}: {
  scenario: Scenario
  safety: number
  onReply: (delta: number, gave: string | null) => void
  onFinish: () => void
}) {
  const c = ui.channels.mail
  const t = c.toolbar
  const [view, setView] = useState<View>({ kind: 'inbox' })
  const [sub, setSub] = useState<Sub>('none')
  const [read, setRead] = useState<string[]>([])
  const [toast, setToast] = useState('')
  const done = useRef(false)
  const situationLabel = situations.find((s) => s.id === scenario.situation)?.label ?? ''

  /** 받은편지함 — 새로 온 순서대로(피싱은 가운데) */
  const decoys = scenario.inbox ?? []
  const mails: Array<{ id: string; doc: MailDoc; phish: boolean }> = [
    ...decoys.slice(0, 1).map((d) => ({ id: d.id ?? 'd0', doc: d, phish: false })),
    { id: PHISH, doc: scenario, phish: true },
    ...decoys.slice(1).map((d, i) => ({ id: d.id ?? `d${i + 1}`, doc: d, phish: false })),
  ]
  const open = view.kind === 'mail' ? mails.find((m) => m.id === view.id) : undefined

  /** 피싱 메일에 손을 댄 순간 — 한 번만 채점하고 결과로 */
  const settle = (delta: number, gave: string | null) => {
    if (done.current) return
    done.current = true
    onReply(delta, gave)
    window.setTimeout(onFinish, 400)
  }

  const backToInbox = (message: string, id: string) => {
    setRead((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setToast(message)
    window.setTimeout(() => setToast(''), 2200)
    setView({ kind: 'inbox' })
  }

  /** 도구막대 — 피싱이면 결과가 갈리고, 평범한 메일이면 그냥 처리됩니다 */
  const act = (kind: 'reply' | 'forward' | 'delete' | 'report') => {
    if (!open) return
    if (open.phish) {
      if (kind === 'reply') settle(-30, '발신자에게 회신(내 주소가 살아있음을 알림)')
      else if (kind === 'forward') settle(-30, '동료에게 그대로 전달')
      else settle(5, null) // 삭제 · 신고 = 방어 성공
      return
    }
    const msg =
      kind === 'reply' ? c.toast.replyOk
      : kind === 'forward' ? c.toast.forwardOk
      : kind === 'delete' ? c.toast.deleteOk
      : c.toast.reportOk
    backToInbox(msg, open.id)
  }

  return (
    <div className="flex h-full w-full flex-col wide:flex-row">
      {/* 옆 칸(가로) / 윗줄(세로): 주제 · 안전도 */}
      <aside className="shrink-0 px-5 pt-[max(0.9rem,2vh)] pb-3 wide:flex wide:w-[32%] wide:max-w-[26rem] wide:flex-col wide:justify-center wide:gap-10 wide:px-[3%] wide:py-10">
        <p className="mb-2 text-[0.85rem] font-semibold text-sky wide:mb-0 wide:text-[1rem]">{situationLabel}</p>
        <p className="hidden font-display text-[1.9rem] leading-snug font-bold wide:block">
          {ui.chat.newMessage}
        </p>
        <SafetyGauge value={safety} />
      </aside>

      <section className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-t-2xl bg-white wide:my-4 wide:mr-4 wide:rounded-2xl">
        {view.kind === 'inbox' ? (
          <Inbox
            mails={mails}
            read={read}
            hint={c.arrive.openHint}
            title={c.inbox}
            onOpen={(id) => setView({ kind: 'mail', id })}
          />
        ) : (
          open && (
            <div className="flex h-full min-h-0 flex-col text-[#1f2430]">
              {/* 메일 앱 도구막대 — 색으로 위험을 알려주지 않습니다 */}
              <div className="flex shrink-0 items-center gap-1 border-b border-[#eceff4] px-2 py-2">
                <button
                  type="button"
                  data-role="to-inbox"
                  onClick={() => setView({ kind: 'inbox' })}
                  className="rounded-lg px-2.5 py-2 text-[0.95rem] text-[#5f6b80] active:bg-[#f1f4f9]"
                >
                  ‹ {c.inbox}
                </button>
                <span className="flex-1" />
                <ToolButton label={t.reply} role="reply" onClick={() => act('reply')} d="M9 10V6l-6 6 6 6v-4c4 0 7 1 9 5 0-6-3-9-9-9z" />
                <ToolButton label={t.forward} role="forward" onClick={() => act('forward')} d="M15 10V6l6 6-6 6v-4c-4 0-7 1-9 5 0-6 3-9 9-9z" />
                <ToolButton label={t.delete} role="delete" onClick={() => act('delete')} d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" stroke />
                <ToolButton label={t.report} role="report" onClick={() => act('report')} d="M5 21V4h10l-1 3h5v8h-8l-1-3H7v9" stroke />
              </div>

              <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <div className="mx-auto w-full max-w-[50rem] px-4 py-4">
                  <EmailBody
                    mail={open.doc}
                    render={(x) => x}
                    onLink={() =>
                      open.phish ? setSub('login') : backToInbox(c.toast.linkOk, open.id)
                    }
                    onAttachment={() => open.phish && setSub('install')}
                  />
                </div>
              </div>

              {/* 메일 앱 안내줄 — 늘 붙어 있는 문구라 이 메일만 의심하게 만들지 않습니다 */}
              {open.doc.link && (
                <p className="shrink-0 border-t border-[#eceff4] bg-[#f7f9fc] px-4 py-2.5 text-center text-[0.85rem] text-[#8a93a5]">
                  {c.linkTip}
                </p>
              )}
            </div>
          )
        )}

        {/* 링크를 누르면 뜨는 가짜 로그인 */}
        {sub === 'login' && (
          <Overlay>
            <div className="flex shrink-0 items-center gap-2 px-4 py-3 text-[0.9rem] text-white/50">
              <span className="break-all">🔒 {scenario.link?.url}</span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col justify-center px-6">
              <div className="mx-auto w-full max-w-[24rem]">
                <p className="text-center font-display text-[1.5rem] font-bold">{c.decide.loginTitle}</p>
                <p className="mt-1.5 text-center text-[1rem] text-white/60">{c.decide.loginDesc}</p>
                <div className="mt-6 flex flex-col gap-3">
                  <input
                    className="rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-[1.05rem] text-white placeholder:text-white/35 focus:border-gold focus:outline-none"
                    placeholder={c.decide.idPlaceholder}
                    autoComplete="off"
                    aria-label={c.decide.idLabel}
                  />
                  <input
                    type="password"
                    className="rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-[1.05rem] text-white placeholder:text-white/35 focus:border-gold focus:outline-none"
                    placeholder={c.decide.pwPlaceholder}
                    autoComplete="off"
                    aria-label={c.decide.pwLabel}
                  />
                  <button
                    type="button"
                    data-role="fake-login"
                    onClick={() => settle(-60, '가짜 포털에 로그인(아이디·비밀번호)')}
                    className="mt-1 rounded-lg bg-gold px-4 py-3 font-display text-[1.05rem] font-bold text-navy-deep active:bg-gold-deep"
                  >
                    {c.decide.loginBtn}
                  </button>
                  <button
                    type="button"
                    data-role="sub-back"
                    onClick={() => setSub('none')}
                    className="rounded-lg px-4 py-2.5 text-[1rem] font-semibold text-white/70 active:text-white"
                  >
                    ← {c.decide.back}
                  </button>
                </div>
              </div>
            </div>
          </Overlay>
        )}

        {/* 첨부파일을 누르면 뜨는 실행 확인 */}
        {sub === 'install' && (
          <Overlay>
            <div className="flex min-h-0 flex-1 flex-col justify-center px-6">
              <div className="mx-auto w-full max-w-[24rem] rounded-2xl bg-white p-6 text-[#1f2430]">
                <p className="text-[1.1rem] font-bold break-all">{scenario.attachment?.name}</p>
                <p className="mt-2 text-[1rem] text-[#5b6474]">{c.decide.installDesc}</p>
                <div className="mt-5 flex gap-2.5">
                  <button
                    type="button"
                    data-role="sub-back"
                    onClick={() => setSub('none')}
                    className="flex-1 rounded-lg border border-[#d9dee7] px-4 py-3 text-[1rem] font-semibold text-[#3a4250] active:bg-[#f1f4f9]"
                  >
                    {c.decide.cancel}
                  </button>
                  <button
                    type="button"
                    data-role="fake-install"
                    onClick={() => settle(-60, '기기에 악성 앱 설치')}
                    className="flex-1 rounded-lg bg-[#2f6be0] px-4 py-3 text-[1rem] font-bold text-white active:bg-[#2459c2]"
                  >
                    {c.decide.install}
                  </button>
                </div>
              </div>
            </div>
          </Overlay>
        )}

        {/* 평범한 메일을 처리했을 때 잠깐 뜨는 안내 */}
        {toast && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-x-4 bottom-4 z-30 rounded-xl bg-[#1f2430] px-4 py-3 text-center text-[0.95rem] text-white shadow-lg"
          >
            {toast}
          </motion.p>
        )}
      </section>
    </div>
  )
}

/** 받은편지함 목록 */
function Inbox({
  mails,
  read,
  hint,
  title,
  onOpen,
}: {
  mails: Array<{ id: string; doc: MailDoc; phish: boolean }>
  read: string[]
  hint: string
  title: string
  onOpen: (id: string) => void
}) {
  const unread = mails.filter((m) => !read.includes(m.id)).length
  return (
    <div className="flex h-full min-h-0 flex-col text-[#1f2430]">
      <div className="flex shrink-0 items-center gap-2 border-b border-[#eceff4] px-5 py-3.5">
        <span className="font-display text-[1.2rem] font-bold text-navy">{title}</span>
        {unread > 0 && (
          <span className="rounded-full bg-[#2f6be0] px-2 py-0.5 text-[0.78rem] font-bold text-white">
            {unread}
          </span>
        )}
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[44rem]">
          {mails.map((m) => {
            const isRead = read.includes(m.id)
            return (
              <button
                key={m.id}
                type="button"
                data-role={m.phish ? 'open-phish' : 'open-decoy'}
                onClick={() => onOpen(m.id)}
                className={`flex w-full items-start gap-3 border-b border-[#f2f4f8] px-5 py-4 text-left active:bg-[#eef4ff] ${
                  isRead ? 'opacity-55' : ''
                }`}
              >
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                    isRead ? 'bg-transparent' : 'bg-[#2f6be0]'
                  }`}
                />
                <span className="flex h-[2.4rem] w-[2.4rem] shrink-0 items-center justify-center rounded-full bg-[#e9edf3] text-[0.9rem] font-bold text-[#5f6b80]">
                  {m.doc.sender.name.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between text-[1rem]">
                    <span className={`truncate ${isRead ? 'text-[#6b7280]' : 'font-bold text-[#1f2430]'}`}>
                      {m.doc.sender.name}
                    </span>
                    <span className="shrink-0 pl-2 text-[0.82rem] text-[#9aa1ad]">{m.doc.time}</span>
                  </span>
                  <span className={`block truncate text-[1.02rem] ${isRead ? 'text-[#8a93a5]' : 'font-semibold'}`}>
                    {m.doc.subject}
                  </span>
                  <span className="mt-0.5 block truncate text-[0.92rem] text-[#9aa1ad]">
                    {(m.doc.body ?? '').split('\n')[0]}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <p className="shrink-0 border-t border-[#eceff4] bg-[#f7f9fc] px-4 py-3 text-center text-[0.95rem] font-semibold text-[#2f6be0]">
        {hint}
      </p>
    </div>
  )
}

function ToolButton({
  label,
  role,
  onClick,
  d,
  stroke,
}: {
  label: string
  role: string
  onClick: () => void
  d: string
  stroke?: boolean
}) {
  return (
    <button
      type="button"
      data-role={role}
      onClick={onClick}
      className="flex min-w-[3.2rem] flex-col items-center gap-0.5 rounded-lg px-1.5 py-1.5 text-[#5f6b80] active:bg-[#f1f4f9]"
    >
      <svg
        className="h-[1.25rem] w-[1.25rem]"
        viewBox="0 0 24 24"
        fill={stroke ? 'none' : 'currentColor'}
        stroke={stroke ? 'currentColor' : 'none'}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={d} />
      </svg>
      <span className="text-[0.72rem] font-semibold">{label}</span>
    </button>
  )
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-20 flex flex-col bg-[#0e1633] text-white"
    >
      {children}
    </motion.div>
  )
}
