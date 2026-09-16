import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ui } from '../lib/content'
import type { MailDoc, Scenario } from '../types'

/**
 * 업무 이메일 — 연구실·산학협력.
 *
 * ★ 메일은 대화가 아닙니다. 한 통을 통째로 읽고, 실제 메일 앱처럼 조작합니다.
 *   위험한 행동을 빨간 버튼으로 알려주지 않습니다 — 본문 속 파란 버튼과 첨부파일이
 *   '가장 자연스러운 다음 행동'으로 놓여 있고, 무엇을 누르는지가 곧 답입니다.
 *
 * ★ 링크의 진짜 주소는 **꾹 눌러야** 보입니다(실제 방어법 그대로).
 *   찾기 화면에서만 주소를 펼쳐 놓고 누를 수 있게 합니다(revealUrl).
 */

/** ChannelView 로 들어오는 건 '찾기' 화면뿐 — 받은편지함 틀로 감쌉니다. */
export function MailView({
  scenario,
  render,
}: {
  scenario: Scenario
  render: (t: string) => ReactNode
}) {
  const c = ui.channels.mail
  return (
    <div className="flex h-full min-h-0 flex-col bg-white text-[#1f2430]">
      <div className="flex shrink-0 items-center gap-4 border-b border-[#eceff4] px-4 py-3 text-[0.95rem] text-[#5f6b80]">
        <span>‹ {c.inbox}</span>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[50rem] px-4 py-4">
          <EmailBody mail={scenario} render={render} revealUrl />
        </div>
      </div>
    </div>
  )
}

/** 메일 한 통의 알맹이 — 제목·보낸 사람·본문·링크·첨부·서명 */
export function EmailBody({
  mail,
  render,
  revealUrl = false,
  onLink,
  onAttachment,
}: {
  mail: MailDoc
  render: (t: string) => ReactNode
  /** 링크 주소를 펼쳐서 보여줄지 (찾기 화면에서만 true) */
  revealUrl?: boolean
  onLink?: () => void
  onAttachment?: () => void
}) {
  const c = ui.channels.mail
  const initial = mail.sender.name.slice(0, 1)

  return (
    <article>
      <h2 className="text-[1.3rem] leading-snug font-bold [text-wrap:balance]">{mail.subject}</h2>

      {/* 보낸 사람 */}
      <div className="mt-3 flex items-center gap-3 border-b border-[#eceff4] pb-3">
        <span className="flex h-[2.6rem] w-[2.6rem] shrink-0 items-center justify-center rounded-full bg-[#e3ebff] text-[1rem] font-bold text-[#2f55b8]">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[1.02rem] font-bold text-[#1f2430]">{mail.sender.name}</p>
          {mail.sender.address && (
            <p className="break-all text-[0.92rem] text-[#6b7280]">&lt;{render(mail.sender.address)}&gt;</p>
          )}
        </div>
        {mail.time && <span className="shrink-0 text-[0.82rem] text-[#9aa1ad]">{mail.time}</span>}
      </div>

      {/* 본문 */}
      <div className="mt-4 text-[1.05rem] leading-relaxed whitespace-pre-line text-[#2b3140]">
        {render(mail.body ?? '')}
      </div>

      {/* 파란 링크 버튼 — 주소는 꾹 눌러야 보입니다 */}
      {mail.link && (
        <LinkButton link={mail.link} render={render} revealUrl={revealUrl} onLink={onLink} />
      )}

      {/* 첨부파일 */}
      {mail.attachment && (
        <div className="mt-5">
          <p className="mb-1.5 text-[0.85rem] font-semibold text-[#6b7280]">{c.attachLabel}</p>
          <button
            type="button"
            data-role="attachment"
            onClick={onAttachment}
            className="flex w-full items-center gap-2.5 rounded-xl border border-[#dfe3ea] px-3 py-2.5 text-left active:bg-[#f2f5f9]"
          >
            <span className="flex h-[2.4rem] w-[2rem] shrink-0 items-end justify-center rounded-md bg-[#e05c4b] pb-1 text-[0.6rem] font-extrabold text-white">
              EXE
            </span>
            <span className="min-w-0">
              <span className="block text-[0.95rem] font-bold break-all">{render(mail.attachment.name)}</span>
              <span className="mt-0.5 block text-[0.75rem] text-[#8a8f99]">{mail.attachment.meta}</span>
            </span>
          </button>
        </div>
      )}

      {/* 서명 */}
      {mail.signature && (
        <p className="mt-6 border-t border-[#eceff4] pt-4 text-[0.9rem] leading-relaxed whitespace-pre-line text-[#8a93a5]">
          {mail.signature}
        </p>
      )}
    </article>
  )
}

/**
 * 본문 속 파란 버튼.
 * 그냥 누르면 눌린 것이고, **꾹 누르면 진짜 주소가 뜹니다**(실제 브라우저에서 링크에
 * 손가락을 대고 있으면 주소가 뜨는 것과 같습니다). 누르기 전에 확인하는 습관을
 * 손에 익히게 하는 장치라, 힌트 문구는 메일 앱 안내줄에 늘 붙어 있습니다.
 */
function LinkButton({
  link,
  render,
  revealUrl,
  onLink,
}: {
  link: { label: string; url: string }
  render: (t: string) => ReactNode
  revealUrl: boolean
  onLink?: () => void
}) {
  const [peek, setPeek] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const longPressed = useRef(false)

  const start = () => {
    longPressed.current = false
    timer.current = window.setTimeout(() => {
      longPressed.current = true
      setPeek(true)
    }, 450)
  }
  const end = () => {
    window.clearTimeout(timer.current)
    setPeek(false)
  }

  return (
    <div className="relative mt-5 inline-block">
      {/* 꾹 눌렀을 때 뜨는 진짜 주소 */}
      {peek && !revealUrl && (
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-2 left-0 z-10 max-w-[18rem] -translate-y-full rounded-lg bg-[#1f2430] px-3 py-2 text-[0.85rem] break-all text-white shadow-lg"
        >
          {link.url}
        </motion.span>
      )}

      <button
        type="button"
        data-role="mail-link"
        onPointerDown={start}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => {
          // 꾹 눌러 주소만 확인한 경우에는 누른 것으로 치지 않습니다
          if (longPressed.current) {
            longPressed.current = false
            return
          }
          onLink?.()
        }}
        className="rounded-lg bg-[#2f6be0] px-6 py-3 text-[1.02rem] font-bold text-white active:bg-[#2459c2]"
      >
        {link.label}
      </button>

      {/* 찾기 화면에서는 주소를 펼쳐 놓습니다(눌러서 찾을 수 있게) */}
      {revealUrl && (
        <p className="mt-1.5 break-all text-[0.9rem] text-[#8a93a5]">{render(link.url)}</p>
      )}
    </div>
  )
}
