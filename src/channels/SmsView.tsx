import { Fragment } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ui } from '../lib/content'
import { Hint, clock, day, pop, sendOnEnter, useStickBottom } from './shared'
import type { ChannelProps } from './shared'

/** 한 줄이 통째로 인터넷 주소면 링크처럼 보이게 합니다 (sb-career.support/apply) */
const LINK_LINE = /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i

/**
 * 휴대폰 문자 — 학회·논문(첨부파일), 취업·채용(링크).
 *
 * 저장 안 된 번호가 맨 위에 크게 뜨고 '연락처 추가'가 붙는, 흔한 기본 문자 앱 모양.
 * turns[].attachment 가 있으면 파일 카드, turns[].preview 가 있으면 링크 미리보기 카드.
 */
export function SmsView({ scenario, items, readIndex, render, compose }: ChannelProps) {
  const c = ui.channels.sms
  const ref = useStickBottom(!!compose, [items.length])
  const today = items[0]?.at ?? new Date()

  return (
    <div className="flex h-full min-h-0 flex-col bg-white text-[#111]">
      {/* 문자 앱 윗줄 — 저장 안 된 번호 */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[#f0f1f4] px-4 py-3">
        <span className="text-[1.3rem] leading-none text-[#555]">‹</span>
        <div className="min-w-0">
          <p className="text-[1.25rem] leading-tight font-bold tabular-nums">
            {render(scenario.sender.number)}
          </p>
          <p className="mt-0.5 text-[0.78rem] text-[#8a8f99]">{c.kind}</p>
        </div>
        <span className="ml-auto shrink-0 rounded-full border border-[#cfdcf6] px-2.5 py-1 text-[0.78rem] font-semibold text-[#2f6be0]">
          {c.addContact}
        </span>
      </div>

      <div ref={ref} className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-[46rem] flex-col gap-2 px-3 py-3">
          <p className="self-center py-1 text-[0.78rem] text-[#8a8f99]">{day(today)}</p>

          {items.map((it, i) => {
            const turn = it.turn !== undefined ? scenario.turns[it.turn] : undefined
            if (it.from === 'me') {
              return (
                <motion.div key={i} {...pop} className="flex flex-col items-end">
                  <p className="max-w-[80%] rounded-[1.1rem] rounded-br-md bg-[#3478f6] px-3.5 py-2.5 text-[1.05rem] leading-normal whitespace-pre-line text-white">
                    {it.text}
                  </p>
                  <span className="mt-0.5 mr-1 text-[0.72rem] text-[#a1a6ae]">
                    {i === readIndex ? `${ui.chat.read} · ` : ''}
                    {clock(it.at)}
                  </span>
                </motion.div>
              )
            }
            return (
              <motion.div key={i} {...pop} className="flex flex-col items-start">
                <div className="max-w-[82%] rounded-[1.1rem] rounded-bl-md bg-[#eef0f3] px-3.5 py-2.5 text-[1.05rem] leading-normal">
                  <p className="whitespace-pre-line">{lines(it.text, render)}</p>

                  {turn?.attachment && (
                    <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-[#dfe3ea] bg-white px-3 py-2.5">
                      <span className="flex h-[2.4rem] w-[2rem] shrink-0 items-end justify-center rounded-md bg-[#3ddc84] pb-1 text-[0.62rem] font-extrabold text-white">
                        APK
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[0.95rem] font-bold break-all">
                          {render(turn.attachment.name)}
                        </span>
                        <span className="mt-0.5 block text-[0.75rem] text-[#8a8f99]">{turn.attachment.meta}</span>
                      </span>
                      <span className="ml-auto shrink-0 pl-2 text-[0.85rem] font-bold text-[#2f6be0]">{c.open}</span>
                    </div>
                  )}

                  {turn?.preview && (
                    <div className="mt-2 overflow-hidden rounded-xl border border-[#dfe3ea] bg-white">
                      <div className="flex h-[3.6rem] items-center bg-gradient-to-br from-[#dbe6ff] to-[#f1f5ff] px-3 text-[0.85rem] font-extrabold text-[#5a74c9]">
                        {turn.preview.site}
                      </div>
                      <p className="px-3 pt-2 text-[0.92rem] font-bold">{turn.preview.title}</p>
                      <p className="px-3 pb-2 text-[0.75rem] text-[#8a8f99]">{turn.preview.domain}</p>
                    </div>
                  )}
                </div>
                <span className="mt-0.5 ml-1 text-[0.72rem] text-[#a1a6ae]">{clock(it.at)}</span>
              </motion.div>
            )
          })}
        </div>
      </div>

      {compose && (
        <div className="shrink-0 px-3 pt-2.5 pb-[max(0.9rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-[46rem]">
            <Hint text={compose.hint} className="text-[#3478f6]" />
            <div className="flex items-center gap-2">
              <span className="flex h-[2.4rem] w-[2.4rem] shrink-0 items-center justify-center rounded-full bg-[#f1f2f5] text-[1.3rem] text-[#6b7280]" aria-hidden="true">
                +
              </span>
              <input
                ref={compose.inputRef}
                value={compose.value}
                onChange={(e) => compose.onChange(e.target.value)}
                onKeyDown={sendOnEnter(compose.onSend)}
                disabled={!compose.canType}
                maxLength={60}
                placeholder={c.placeholder}
                enterKeyHint="send"
                autoComplete="off"
                className="min-w-0 flex-1 rounded-full bg-[#f1f2f5] px-4 py-2.5 text-[1.05rem] text-[#111] placeholder:text-[#9aa3b5] focus:outline-2 focus:outline-[#3478f6] disabled:opacity-50"
              />
              <button
                type="button"
                onClick={compose.onSend}
                disabled={!compose.canType || compose.value.trim().length === 0}
                aria-label={c.send}
                className="flex h-[2.6rem] w-[2.6rem] shrink-0 items-center justify-center rounded-full bg-[#3478f6] active:bg-[#2563d9] disabled:opacity-35"
              >
                <svg width="46%" height="46%" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                  <path d="M3 20l18-8L3 4v6l12 2-12 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** 본문을 줄마다 그립니다. 주소만 있는 줄은 파란 밑줄 링크로. */
function lines(text: string, render: (t: string) => ReactNode) {
  const all = text.split('\n')
  return all.map((line, i) => (
    <Fragment key={i}>
      {LINK_LINE.test(line.trim()) ? (
        <span className="break-all text-[#1f5fd1] underline">{render(line)}</span>
      ) : (
        render(line)
      )}
      {i < all.length - 1 ? '\n' : null}
    </Fragment>
  ))
}
