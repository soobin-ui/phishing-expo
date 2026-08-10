import type { ReactNode } from 'react'
import type { Act } from '../types'

const actClass: Record<Act, string> = {
  // 1막: 밝고 산뜻한 심리테스트
  bright: 'bg-gradient-to-b from-[#eaf1ff] via-[#f6f9ff] to-[#ffffff] text-slate-900',
  // 2막: 리빌 이후 — 어둡고 각진 경고 화면
  dark: 'bg-[#0a0d16] text-white',
  // 3막: 어둡지만 참가자 쪽에 파란 주도권이 생김
  counter: 'bg-[#080c18] text-white',
}

/**
 * 세로(9:16) 고정 무대.
 * 태블릿에서는 화면을 꽉 채우고, PC 브라우저에서는 태블릿 비율의 세로 화면으로 보입니다.
 */
export function Stage({ act, children }: { act: Act; children: ReactNode }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black">
      <div
        className={`relative h-full w-full max-w-[min(100vw,calc(100dvh*9/16))] overflow-hidden transition-colors duration-500 ${actClass[act]}`}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * 한 화면의 뼈대.
 * 위쪽은 읽기 전용, 아래쪽 55%는 손이 닿는 조작 영역입니다.
 */
export function ScreenLayout({
  top,
  bottom,
}: {
  top?: ReactNode
  bottom?: ReactNode
}) {
  return (
    <div className="flex h-full w-full flex-col px-6 pt-[max(28px,env(safe-area-inset-top))] pb-[max(28px,env(safe-area-inset-bottom))]">
      <div className="flex min-h-0 flex-[45] flex-col justify-center">{top}</div>
      <div className="flex min-h-0 flex-[55] flex-col justify-end gap-4">{bottom}</div>
    </div>
  )
}
