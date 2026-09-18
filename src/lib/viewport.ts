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

/** 앱이 뜰 때 한 번 — 보이는 높이 재기 + 전체화면 되돌리기 */
export function installKiosk() {
  const vv = window.visualViewport
  /** 키보드가 올라오기 전, 이 기기의 '꽉 찬' 보이는 높이 */
  let full = 0

  const measure = () => {
    const h = vv?.height ?? window.innerHeight
    if (h > full * 0.75) full = Math.max(full, h)
    const keyboard = full > 0 && h < full * 0.75
    document.documentElement.style.setProperty('--app-h', `${Math.round(keyboard ? full : h)}px`)
  }

  measure()
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
