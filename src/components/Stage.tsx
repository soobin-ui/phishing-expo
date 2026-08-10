import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Act } from '../types'

/**
 * 무대 크기(디자인 기준). 모든 화면은 이 크기 안에서 짭니다.
 * 태블릿 세로 9:16.
 */
export const STAGE_W = 810
export const STAGE_H = 1440

const actClass: Record<Act, string> = {
  // 1막: 밝고 산뜻한 안내 화면
  bright: 'bg-gradient-to-b from-[#eaf1ff] via-[#f6f9ff] to-[#ffffff] text-slate-900',
  // 2막: 어둡고 각진 경고 화면
  dark: 'bg-[#0a0d16] text-white',
  // 3막: 어둡지만 참가자 쪽에 파란 주도권이 생김
  counter: 'bg-[#080c18] text-white',
}

/**
 * ★ 810 × 1440 짜리 무대를 하나 만들어 놓고, 화면 크기에 맞게 통째로 축소합니다.
 *
 *   글자 크기를 화면마다 다시 계산하는 방식은 어딘가 반드시 깨집니다.
 *   (실제로 휴대폰에서 열었을 때 제목과 카드가 겹쳐 나왔습니다)
 *   무대 하나를 통째로 줄이면 어떤 기기에서 열어도 비율만 작아질 뿐
 *   글자가 겹치거나 넘칠 수 없습니다.
 */
export function Stage({ act, children }: { act: Act; children: ReactNode }) {
  const [scale, setScale] = useState(() => fitScale())

  useEffect(() => {
    const fit = () => setScale(fitScale())
    fit()
    window.addEventListener('resize', fit)
    window.addEventListener('orientationchange', fit)
    // 주소창이 접히고 펴질 때도 다시 맞춥니다
    window.visualViewport?.addEventListener('resize', fit)
    return () => {
      window.removeEventListener('resize', fit)
      window.removeEventListener('orientationchange', fit)
      window.visualViewport?.removeEventListener('resize', fit)
    }
  }, [])

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black">
      {/*
        shrink-0 이 반드시 있어야 합니다.
        없으면 flex 자식이라 810px 가 화면 폭에 맞게 먼저 찌그러지고,
        그 위에 scale 이 또 걸려서 두 번 줄어듭니다(글자가 다시 줄바꿈됩니다).
      */}
      <div
        className={`relative shrink-0 overflow-hidden transition-colors duration-500 ${actClass[act]}`}
        style={{
          width: STAGE_W,
          height: STAGE_H,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function fitScale(): number {
  if (typeof window === 'undefined') return 1
  const w = window.visualViewport?.width ?? window.innerWidth
  const h = window.visualViewport?.height ?? window.innerHeight
  return Math.min(w / STAGE_W, h / STAGE_H)
}

/**
 * 한 화면의 뼈대.
 * 위쪽은 읽기 전용, 아래쪽 55%는 손이 닿는 조작 영역입니다.
 */
export function ScreenLayout({ top, bottom }: { top?: ReactNode; bottom?: ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col px-8 py-10">
      <div className="flex min-h-0 flex-[45] flex-col justify-center">{top}</div>
      <div className="flex min-h-0 flex-[55] flex-col justify-end gap-4">{bottom}</div>
    </div>
  )
}
