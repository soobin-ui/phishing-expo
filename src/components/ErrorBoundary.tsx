import { Component, Fragment } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

/**
 * 행사장 안전망 — 화면 어딘가에서 오류가 나도 **빈 화면으로 멈추지 않게** 합니다(2026-09-21).
 *
 * React 는 그리는 도중 오류가 나면 앱 전체를 내려 버립니다(= 까만 빈 화면, 새로고침 전까지 복구 불가).
 * 부스에서는 운영자가 매번 새로고침해 줄 수 없으므로:
 *   1) 안내 문구를 잠깐 보여주고
 *   2) 2.5초 뒤 앱을 처음 화면부터 새로 띄웁니다(손댈 필요 없음, 눌러도 바로 복구)
 *   3) 짧은 시간에 거듭 실패하면 페이지를 통째로 새로고침합니다(1분에 한 번까지만 — 새로고침 무한 반복 방지)
 *
 * ★ 이모지는 쓰지 마세요 — 태블릿 기종에 따라 네모로 깨집니다.
 */
const RECOVER_MS = 2500
const RELOAD_KEY = 'expo:lastReload'

type State = { failed: boolean; gen: number }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false, gen: 0 }
  private timer: number | undefined
  private recent: number[] = []

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
    const now = Date.now()
    this.recent = [...this.recent.filter((t) => now - t < 15000), now]
    window.clearTimeout(this.timer)
    this.timer = window.setTimeout(this.recover, RECOVER_MS)
  }

  componentWillUnmount() {
    window.clearTimeout(this.timer)
  }

  recover = () => {
    window.clearTimeout(this.timer)
    // 15초 안에 세 번째 실패 → 다시 띄워도 소용없는 상태. 페이지를 새로 받습니다
    if (this.recent.length >= 3 && this.canReload()) {
      window.location.reload()
      return
    }
    this.setState((s) => ({ failed: false, gen: s.gen + 1 }))
  }

  private canReload() {
    try {
      const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0)
      if (Date.now() - last < 60000) return false
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
      return true
    } catch {
      return false
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <button
          type="button"
          data-role="error-recover"
          onClick={this.recover}
          className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-[#050a18] px-6 text-center text-white"
        >
          <span className="font-display text-[1.8rem] leading-snug font-bold">잠시만 기다려 주세요</span>
          <span className="text-[1.15rem] text-white/75">처음 화면으로 돌아갑니다</span>
        </button>
      )
    }
    return <Fragment key={this.state.gen}>{this.props.children}</Fragment>
  }
}
