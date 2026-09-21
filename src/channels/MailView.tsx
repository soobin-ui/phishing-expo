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
  solvedLink = false,
  solvedFile = false,
  hintLink = false,
  hintFile = false,
  focusLink = false,
  focusFile = false,
}: {
  mail: MailDoc
  render: (t: string) => ReactNode
  /** 링크 주소를 펼쳐서 보여줄지 (찾기 화면에서만 true) */
  revealUrl?: boolean
  /** 누른 요소를 그대로 넘깁니다 — 수사 모드에서 말풍선을 그 자리 옆에 띄우려고 */
  onLink?: (el: HTMLElement, at: { clientX: number; clientY: number }) => void
  onAttachment?: (el: HTMLElement, at: { clientX: number; clientY: number }) => void
  /** 수사 모드에서 이미 확인된 곳은 빨갛게 표시 */
  solvedLink?: boolean
  solvedFile?: boolean
  /** 힌트 — 노랗게 빛나게 */
  hintLink?: boolean
  hintFile?: boolean
  /** 검거 카드 옆 다시 보기 — 지금 카드가 가리키는 곳은 붉게 빛나게 */
  focusLink?: boolean
  focusFile?: boolean
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
        <LinkButton link={mail.link} revealUrl={revealUrl} onLink={onLink} solved={solvedLink} hint={hintLink} focus={focusLink} />
      )}

      {/* 첨부파일 */}
      {mail.attachment && (
        <div className="mt-5">
          <p className="mb-1.5 text-[0.85rem] font-semibold text-[#6b7280]">{c.attachLabel}</p>
          <button
            type="button"
            data-role="attachment"
            onClick={(e) => onAttachment?.(e.currentTarget, e)}
            className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left active:bg-[#f2f5f9] ${
              focusFile ? 'focus-glow border-red-400 bg-red-50' : solvedFile ? 'border-red-400 bg-red-50' : hintFile ? 'hint-glow border-gold' : 'border-[#dfe3ea]'
            }`}
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

      {/* 맺음말 — 본문과 같은 글자로 ("본 조치는 … 드림") */}
      {mail.closing && (
        <div className="mt-5 text-[1.05rem] leading-relaxed whitespace-pre-line text-[#2b3140]">
          {render(mail.closing)}
        </div>
      )}

      {/* 발신전용 안내·주소·저작권 — 실제 기관 메일처럼 회색 작은 글자 */}
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
  revealUrl,
  onLink,
  solved = false,
  hint = false,
  focus = false,
}: {
  link: { label: string; url: string }
  revealUrl: boolean
  onLink?: (el: HTMLElement, at: { clientX: number; clientY: number }) => void
  solved?: boolean
  hint?: boolean
  focus?: boolean
}) {
  const [peek, setPeek] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const longPressed = useRef(false)
  /** 꾹 누름을 이미 '누름'으로 처리했으면, 뒤따라오는 click 은 한 번 흘려보냅니다(두 번 처리 방지) */
  const swallowClick = useRef(false)

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
        onPointerUp={(e) => {
          const wasLong = longPressed.current
          end()
          /*
           * ★ 수사 모드(onLink 있음)에서는 꾹 눌렀다 떼도 '누른 것'으로 칩니다(2026-09-21).
           *   행사장에서는 버튼을 천천히 꾹 누르는 분이 많은데, 예전에는 0.45초만 넘어도 주소만 잠깐 보이고
           *   아무 일도 안 일어나서 "눌렀는데 다음 화면이 안 나온다"가 됐습니다.
           *   터치 기기는 꾹 누르면 click 자체가 안 오기도 해서, 손을 뗀 이 자리에서 바로 처리합니다.
           */
          if (wasLong && onLink) {
            longPressed.current = false
            swallowClick.current = true
            window.setTimeout(() => (swallowClick.current = false), 400)
            onLink(e.currentTarget, e)
          }
        }}
        onPointerLeave={end}
        onPointerCancel={end}
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => {
          if (swallowClick.current) {
            swallowClick.current = false
            return
          }
          // (수사 모드가 아닐 때) 꾹 눌러 주소만 확인한 경우에는 누른 것으로 치지 않습니다
          if (longPressed.current) {
            longPressed.current = false
            return
          }
          onLink?.(e.currentTarget, e)
        }}
        className={`rounded-lg px-6 py-3 text-[1.02rem] font-bold text-white ${
          focus ? 'focus-glow bg-red-600' : solved ? 'bg-red-600 ring-2 ring-red-300' : hint ? 'hint-glow bg-[#2f6be0]' : 'bg-[#2f6be0] active:bg-[#2459c2]'
        }`}
      >
        {link.label}
      </button>

      {/* 찾기 화면에서는 주소를 펼쳐 놓습니다(눌러서 찾을 수 있게) */}
      {(revealUrl || solved) && (
        <p className="mt-1.5 break-all text-[0.9rem] font-semibold text-red-600">{link.url}</p>
      )}
    </div>
  )
}
