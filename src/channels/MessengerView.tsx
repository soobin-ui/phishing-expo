import { motion } from 'framer-motion'
import { ui } from '../lib/content'
import { Dots, Hint, clock, pop, sendOnEnter, useStickBottom } from './shared'
import type { ChannelProps } from './shared'

/**
 * 메신저 — 가족·자녀.
 *
 * ★ 특정 메신저 앱의 이름·로고·정확한 색은 쓰지 않습니다. '흔한 메신저' 느낌까지만.
 * ★ 맨 위 '친구로 추가되지 않은 사용자' 경고가 이 주제의 첫 번째 수상한 곳입니다
 *   (sender.notice). 실제 메신저도 이렇게 띄워 주는데 대부분 그냥 지나칩니다.
 */
export function MessengerView({ scenario, items, typing, render, compose }: ChannelProps) {
  const c = ui.channels.messenger
  const ref = useStickBottom(!!compose, [items.length, typing])

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#bfd2e3] text-[#111]">
      {/* 대화방 윗줄 */}
      <div className="flex shrink-0 items-center gap-2.5 px-4 py-3">
        <span className="text-[1.3rem] leading-none">‹</span>
        <span className="text-[1.15rem] font-bold">{scenario.sender.name}</span>
        <span className="ml-auto flex gap-3.5 text-[#374151]" aria-hidden="true">
          <svg className="h-[1.15rem] w-[1.15rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="6" />
            <path d="M20 20l-4.5-4.5" />
          </svg>
          <svg className="h-[1.15rem] w-[1.15rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </span>
      </div>

      <div ref={ref} className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-[46rem] flex-col gap-1.5 px-3 pb-3">
          {/* 친구 아님 경고 */}
          {scenario.sender.notice && (
            <div className="mb-2 rounded-xl bg-white px-4 py-3 text-[0.85rem] leading-normal text-[#374151]">
              <p className="flex items-start gap-1.5 text-[0.95rem] font-extrabold text-[#111]">
                <svg className="mt-0.5 h-[1.05rem] w-[1.05rem] shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3L22 20H2Z" fill="#f59e0b" />
                  <path d="M12 10v4.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
                  <circle cx="12" cy="17.3" r="1.2" fill="#fff" />
                </svg>
                <span>{render(scenario.sender.notice)}</span>
              </p>
              <p className="mt-1">{c.noticeBody}</p>
            </div>
          )}

          {items.map((it, i) => {
            if (it.from === 'me') {
              return (
                <motion.div key={i} {...pop} className="flex items-end justify-end gap-1.5">
                  <span className="shrink-0 pb-0.5 text-[0.7rem] text-[#5b6b7c]">{clock(it.at)}</span>
                  <p className="max-w-[75%] rounded-[0.9rem] rounded-tr-sm bg-[#ffe14d] px-3 py-2 text-[1.05rem] leading-normal whitespace-pre-line">
                    {it.text}
                  </p>
                </motion.div>
              )
            }
            // 같은 사람이 연달아 보내면 프로필·이름은 첫 말풍선에만
            const first = i === 0 || items[i - 1].from !== 'them'
            return (
              <motion.div key={i} {...pop} className={`flex items-start gap-2 ${first ? 'mt-1.5' : ''}`}>
                {first ? <Avatar /> : <span className="w-[2.3rem] shrink-0" />}
                <div className="flex min-w-0 flex-col items-start">
                  {first && <p className="mb-1 text-[0.78rem] text-[#4b5563]">{scenario.sender.name}</p>}
                  <div className="flex items-end gap-1.5">
                    <p className="max-w-[17rem] rounded-[0.9rem] rounded-tl-sm bg-white px-3 py-2 text-[1.05rem] leading-normal whitespace-pre-line sm:max-w-[24rem]">
                      {render(it.text)}
                    </p>
                    <span className="shrink-0 pb-0.5 text-[0.7rem] text-[#5b6b7c]">{clock(it.at)}</span>
                  </div>
                </div>
              </motion.div>
            )
          })}

          {typing && (
            <motion.div {...pop} className="mt-1.5 flex items-start gap-2">
              <Avatar />
              <span className="rounded-[0.9rem] rounded-tl-sm bg-white px-3.5 py-3">
                <Dots className="bg-[#9aa7b4]" />
              </span>
            </motion.div>
          )}
        </div>
      </div>

      {compose && (
        <div className="shrink-0 bg-white px-3 pt-2.5 pb-[max(0.9rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-[46rem]">
            <Hint text={compose.hint} className="text-[#1c2e63]" />
            <div className="flex items-stretch gap-2">
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
                className="min-w-0 flex-1 rounded-lg bg-[#f3f4f6] px-3.5 py-2.5 text-[1.05rem] text-[#111] placeholder:text-[#9aa3b5] focus:outline-2 focus:outline-[#e6c200] disabled:opacity-50"
              />
              <button
                type="button"
                onClick={compose.onSend}
                disabled={!compose.canType || compose.value.trim().length === 0}
                className="shrink-0 rounded-lg bg-[#ffe14d] px-4 text-[1rem] font-extrabold text-[#3a2f00] active:bg-[#f5d31f] disabled:opacity-40"
              >
                {c.send}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** 프로필 사진이 없는 기본 얼굴 */
function Avatar() {
  return (
    <span className="flex h-[2.3rem] w-[2.3rem] shrink-0 items-end justify-center overflow-hidden rounded-[0.85rem] bg-[#9fb3c8]" aria-hidden="true">
      <svg width="82%" height="82%" viewBox="0 0 30 30" fill="#e6edf4">
        <circle cx="15" cy="11" r="6" />
        <path d="M3 30c1-7 6-10 12-10s11 3 12 10z" />
      </svg>
    </span>
  )
}
