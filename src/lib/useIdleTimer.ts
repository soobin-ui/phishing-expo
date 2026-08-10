import { useEffect, useRef, useState } from 'react'

/**
 * 60초 동안 아무 입력이 없으면 5초 카운트다운 후 처음으로 돌아갑니다.
 * 반환값이 숫자면 카운트다운 중(화면에 표시), null이면 평상시입니다.
 */
export function useIdleTimer(options: {
  enabled: boolean
  idleMs?: number
  graceMs?: number
  onReset: () => void
}): number | null {
  const { enabled, idleMs = 60_000, graceMs = 5_000, onReset } = options
  const [remaining, setRemaining] = useState<number | null>(null)
  const lastActivity = useRef(Date.now())
  const onResetRef = useRef(onReset)
  onResetRef.current = onReset

  useEffect(() => {
    if (!enabled) {
      setRemaining(null)
      return
    }
    lastActivity.current = Date.now()
    const bump = () => {
      lastActivity.current = Date.now()
      setRemaining(null)
    }
    document.addEventListener('pointerdown', bump)
    document.addEventListener('keydown', bump)

    const tick = window.setInterval(() => {
      const idleFor = Date.now() - lastActivity.current
      if (idleFor >= idleMs + graceMs) {
        setRemaining(null)
        onResetRef.current()
      } else if (idleFor >= idleMs) {
        setRemaining(Math.ceil((idleMs + graceMs - idleFor) / 1000))
      }
    }, 250)

    return () => {
      document.removeEventListener('pointerdown', bump)
      document.removeEventListener('keydown', bump)
      window.clearInterval(tick)
    }
  }, [enabled, idleMs, graceMs])

  return remaining
}
