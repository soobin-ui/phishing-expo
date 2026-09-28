/**
 * 어떤 노트북·태블릿에서도 화면이 잘리지 않고, 전체화면이 풀려도 스스로 돌아오게 하는 곳.
 *
 * ── 1. 잘리는 문제 (`--app-h`)
 *  - 아이패드 사파리는 위아래 도구막대를 화면 위에 겹쳐 놓고도, CSS 의 100vh 를
 *    **도구막대까지 포함한 높이**로 계산합니다. 그래서 vh 로 짠 화면은 아래쪽이 잘립니다.
 *    (안드로이드 크롬도 주소창이 보이는 동안 똑같습니다)
 *  - 여기서 `--app-h` 에 **진짜 보이는 높이**(visualViewport)를 넣어 주고,
 *    index.css 와 Stage 가 그 값을 씁니다. dvh 를 모르는 옛 브라우저까지 함께 막아 줍니다.
 *  - 소프트 키보드가 올라와 높이가 뚝 떨어질 때는 줄이지 않습니다
 *    (입력창 하나 때문에 배치가 무너지면 더 이상하니까 — 키보드가 그 위를 덮게 둡니다).
 *
 * ── 1-2. 키보드가 입력칸을 가리는 문제 (`--kb-h`, 2026-09-28 현장 피드백)
 *  - 위처럼 키보드가 화면을 덮게 두었더니, 화면 아래쪽 입력칸(4번 본인확인·결제, 3번 본인 확인)이
 *    키보드 뒤에 숨었습니다. 입력 화면은 한 화면에 딱 맞게 짜여 있어 밀어 볼 여지도 없었습니다.
 *  - 그래서 키보드 높이를 `--kb-h` 에 넣어 주고, 입력칸이 있는 스크롤 상자는 그만큼 아래 여백을 둡니다
 *    (index.css). → 손으로 밀어 볼 수 있고, 누른 입력칸은 키보드 위로 저절로 올라옵니다(revealFocused).
 *  - ★ element.scrollIntoView() 는 쓰지 않습니다 — 바깥 무대까지 밀어 올립니다(lib/scroll.ts 참고).
 *
 * ── 2. 전체화면이 자꾸 풀리는 문제 (`requestKiosk`)
 *  - 안드로이드 태블릿: **소프트 키보드가 올라오면 크롬이 전체화면을 스스로 풉니다.**
 *    (수사관 이름을 적을 때 풀리는 게 이것입니다) 가장자리를 쓸어 상태표시줄을 부르거나,
 *    앱을 잠깐 바꿨다 와도 풀립니다.
 *  - 아이패드(iPadOS 사파리): **애초에 전체화면을 지원하지 않습니다**(동영상만 됩니다).
 *    아이패드는 공유 → '홈 화면에 추가' 로 띄워야 주소창 없이 꽉 찹니다.
 *  - 전체화면은 '사람이 누른 직후'에만 들어갈 수 있어서, 풀린 걸 알아채고 기다렸다가
 *    다음 터치 때 조용히 다시 들어갑니다.
 */

/** 한 번이라도 [수사 시작하기] 를 눌렀는지 — 그 뒤로는 계속 전체화면을 유지합니다 */
let want = false

function enter() {
  if (!want || document.fullscreenElement) return
  document.documentElement.requestFullscreen?.().catch(() => {})
}

/** [수사 시작하기] 에서 한 번 부릅니다. 이후 풀려도 다음 터치에 알아서 돌아옵니다. */
export function requestKiosk() {
  want = true
  enter()
}

/** 이 기기가 전체화면을 지원하는지 (아이패드 사파리는 지원하지 않습니다 — '홈 화면에 추가'로 띄워야 합니다) */
export function canFullscreen(): boolean {
  return typeof document !== 'undefined' && !!document.documentElement.requestFullscreen
}

/** 지금 전체화면인지 */
export function isFullscreen(): boolean {
  return typeof document !== 'undefined' && !!document.fullscreenElement
}

/** 앱이 뜰 때 한 번 — 보이는 높이 재기 + 전체화면 되돌리기 */
export function installKiosk() {
  const vv = window.visualViewport
  /** 키보드가 올라오기 전, 이 기기의 '꽉 찬' 보이는 높이 */
  let full = 0

  /*
   * 키보드 높이는 세 가지 신호 중 큰 값을 씁니다(2026-09-28 실물 태블릿에서 첫 방식이 안 먹힘).
   *   kbVv    보이는 높이(visualViewport)가 줄어든 만큼 — 아이패드 사파리, 전체화면이 아닌 안드로이드 크롬
   *   kbVk    VirtualKeyboard API 가 알려 주는 키보드 높이 — 안드로이드 크롬(전체화면이어도 알려 줌)
   *   kbGuess 어림값 — 위 둘이 아무 말도 없을 때. **전체화면 안드로이드는 키보드가 떠도 화면 크기가 안 바뀌어서**
   *           첫 방식(kbVv)만으로는 키보드를 알아채지 못했습니다. 터치 기기에서 입력칸을 누르면 키보드가
   *           떴다고 보고 화면 높이의 절반(세로 화면은 42%)을 비워 둡니다. 실제보다 조금 넉넉해도 밀 여유가 늘 뿐입니다.
   */
  let kbVv = 0
  let kbVk = 0
  let kbGuess = 0
  const kbNow = () => Math.max(kbVv, kbVk, kbGuess)
  const isField = (el: Element | null): el is HTMLInputElement | HTMLTextAreaElement =>
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit', 'range', 'file'].includes(el.type))
  /**
   * 화면 키보드를 쓰는 기기인가(태블릿·휴대폰).
   * - 터치스크린 노트북은 터치는 되지만 화면 키보드가 없습니다 → 어림값으로 화면을 밀면 안 됩니다.
   * - 키보드 커버·펜을 붙인 태블릿은 '주 입력'이 마우스로 잡히기도 해서, 기기 종류(UA)로도 봅니다.
   *   아이패드는 UA 가 맥으로 나오므로 '맥 + 터치'로 구분합니다.
   */
  const touch = () => {
    const ua = navigator.userAgent
    if (/Android|iPad|iPhone|iPod/i.test(ua)) return true
    if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true
    return window.matchMedia?.('(pointer: coarse)').matches ?? false
  }

  /** 지금 누른 입력칸을 키보드 위 보이는 자리로 — 그 칸이 든 스크롤 상자만 움직입니다 */
  const revealFocused = () => {
    const el = document.activeElement
    if (!isField(el)) return
    const box = el.closest<HTMLElement>('[data-scroll], [data-scroll-screen]')
    if (!box) return
    const seen = vv?.height ?? window.innerHeight
    const top = Math.max(vv?.offsetTop ?? 0, box.getBoundingClientRect().top)
    // 보이는 아래쪽 끝 — 보이는 높이가 줄었으면 그 끝, 아니면 화면 높이에서 키보드 높이를 뺀 곳
    const bottom = Math.min((vv?.offsetTop ?? 0) + seen, window.innerHeight - Math.max(kbVk, kbGuess))
    const r = el.getBoundingClientRect()
    // 이미 잘 보이면 건드리지 않습니다(위로는 이름표 한 줄, 아래로는 여유 조금)
    if (r.top - 36 >= top && r.bottom + 20 <= bottom) return
    // 보이는 자리의 위에서 1/3 쯤에 오도록
    const want = top + (bottom - top) * 0.33
    box.scrollTo({ top: Math.max(0, box.scrollTop + (r.top - want)), behavior: 'smooth' })
  }

  /** 키보드가 가린 높이를 --kb-h 에 — 입력칸이 있는 스크롤 상자가 이만큼 아래 여백을 둡니다(index.css) */
  const applyKb = () => {
    document.documentElement.style.setProperty('--kb-h', `${Math.round(kbNow())}px`)
    if (kbNow() > 0) window.setTimeout(revealFocused, 60)
  }

  const measure = () => {
    const h = vv?.height ?? window.innerHeight
    if (h > full * 0.75) full = Math.max(full, h)
    const keyboard = full > 0 && h < full * 0.75
    document.documentElement.style.setProperty('--app-h', `${Math.round(keyboard ? full : h)}px`)
    kbVv = keyboard ? Math.max(0, full - h) : 0
    if (kbVv > 0) kbGuess = 0
    applyKb()
  }

  measure()

  // 안드로이드 크롬: 키보드 높이를 직접 물어봅니다. overlaysContent 를 켜면 키보드가 화면을 '덮기만' 하고
  // 화면 크기는 건드리지 않습니다 — 우리가 원래 원하던 동작(배치 유지)과 같습니다.
  type VK = EventTarget & { overlaysContent: boolean; boundingRect: DOMRect }
  const vk = (navigator as Navigator & { virtualKeyboard?: VK }).virtualKeyboard
  if (vk) {
    try {
      vk.overlaysContent = true
      vk.addEventListener('geometrychange', () => {
        kbVk = Math.max(0, vk.boundingRect?.height ?? 0)
        if (kbVk > 0) kbGuess = 0
        applyKb()
      })
    } catch {
      // 못 쓰는 기기는 아래 어림값으로 넘어갑니다
    }
  }

  // 입력칸을 누르면 그 칸이 보이게 — 키보드가 올라오는 동안 몇 번 더 맞춥니다
  document.addEventListener('focusin', (e) => {
    if (!isField(e.target as Element)) return
    // 0.35초가 지나도 키보드 높이를 알려 주는 신호가 없으면(전체화면 안드로이드) 어림값으로 자리를 비웁니다
    window.setTimeout(() => {
      if (kbVv > 0 || kbVk > 0 || !touch() || !isField(document.activeElement)) return
      const landscape = window.innerWidth > window.innerHeight
      kbGuess = Math.round(window.innerHeight * (landscape ? 0.5 : 0.42))
      applyKb()
    }, 350)
    ;[80, 450, 800].forEach((ms) => window.setTimeout(revealFocused, ms))
  })
  document.addEventListener('focusout', () => {
    // 다음 칸으로 옮겨 간 것이면 그대로 두고, 입력을 끝낸 것이면 여백을 거둡니다
    window.setTimeout(() => {
      if (isField(document.activeElement)) return
      if (kbGuess > 0) {
        kbGuess = 0
        applyKb()
      }
    }, 200)
  })
  vv?.addEventListener('resize', measure)
  window.addEventListener('resize', measure)
  window.addEventListener('orientationchange', () => {
    full = 0
    // 화면을 돌린 직후에는 아직 예전 크기가 나옵니다 — 몇 번 더 재 봅니다
    ;[0, 120, 320, 700].forEach((ms) => window.setTimeout(measure, ms))
  })

  if (!document.documentElement.requestFullscreen) return
  document.addEventListener('fullscreenchange', () => {
    // 키보드 때문에 풀린 경우가 대부분입니다 — 잠시 뒤 조용히 다시 시도
    if (!document.fullscreenElement) window.setTimeout(enter, 500)
  })
  // 그래도 안 되면 다음 터치에 (사람이 누른 직후여야 브라우저가 허락합니다)
  document.addEventListener('pointerdown', enter, { passive: true })
}
