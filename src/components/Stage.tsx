import type { ReactNode } from 'react'
import type { Act } from '../types'

const actClass: Record<Act, string> = {
  // 1막: 밝은 안내 화면 — 포스터 하늘색을 아주 옅게
  bright: 'bg-gradient-to-b from-sky-pale via-[#f4f9ff] to-white text-navy',
  // 2막: 문자가 오는 화면 — 포스터 남색을 밤빛으로 내린 바탕
  dark: 'bg-night text-white',
  // 3막: 되짚어 보는 화면 — 같은 남색, 한 톤 밝게
  counter: 'bg-gradient-to-b from-night to-night-2 text-white',
}

/**
 * 화면 전체를 채우는 바탕.
 *
 * ★ 예전에는 810×1440 무대를 통째로 축소해서 노트북·가로 태블릿에서
 *   양옆이 검게 비고 휴대폰 크기로만 보였습니다.
 *   이제는 화면을 꽉 채우고, 글자 크기는 index.css 의 rem 기준이,
 *   배치는 각 화면의 `wide:` (가로로 넓은 화면) 규칙이 맞춥니다.
 *
 * ★ 내용이 화면보다 길어지면 잘리지 않고 그 화면 안에서 스크롤됩니다
 *   (ScrollScreen). 정상 크기에서는 스크롤 없이 한 화면에 들어오도록 짭니다.
 */
export function Stage({ act, children }: { act: Act; children: ReactNode }) {
  return (
    <div
      className={`fixed inset-0 overflow-hidden transition-colors duration-500 ${actClass[act]}`}
    >
      {children}
    </div>
  )
}

/**
 * 한 화면의 바깥 틀 — 바깥은 스크롤, 안쪽은 가운데 정렬 두 겹.
 *
 * ⚠️ 한 겹에 justify-center 와 overflow-y-auto 를 같이 걸면
 *    내용이 길어졌을 때 위쪽으로 스크롤해도 닿지 않습니다. 반드시 두 겹으로.
 */
export function ScrollScreen({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className="no-scrollbar h-full w-full overflow-y-auto overscroll-contain" data-scroll-screen>
      <div className={`flex min-h-full w-full flex-col ${className}`}>{children}</div>
    </div>
  )
}
