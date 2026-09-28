import mascot from '../assets/mascot.webp'
import mascot2 from '../assets/mascot2.webp'
import vipPoster from '../assets/vip-poster.webp'

/**
 * 행사장 인터넷이 끊겨도 화면이 비지 않게 — 앱이 뜰 때 이미지·글꼴을 **전부 미리** 받아 둡니다(2026-09-28).
 *
 * 브라우저는 이미지·글꼴을 '처음 화면에 쓰일 때' 받습니다. 그래서 4번 사건의 콘서트 포스터와
 * 지마켓 산스 Medium 은 그 화면이 처음 뜨는 순간에야 받아 왔고, 마침 그때 와이파이가 끊겨 있으면
 * 포스터가 비거나 글꼴이 바뀌어 보였습니다(라이브 전 점검에서 확인).
 *
 * - 이미지는 Image 객체를 계속 들고 있어서(아래 keep) 하루 종일 메모리에 남습니다.
 * - 글꼴은 document.fonts.load 로 굵기별로 한 번씩 불러 둡니다.
 * ★ 새 이미지를 넣으면 여기에도 한 줄 추가하세요. 실패해도 체험은 그대로 진행됩니다.
 */
const keep: HTMLImageElement[] = []

export function preloadAssets() {
  for (const src of [mascot, mascot2, vipPoster]) {
    const img = new Image()
    img.decoding = 'async'
    img.src = src
    keep.push(img)
  }
  try {
    const fonts = ['500 1em "Gmarket Sans"', '700 1em "Gmarket Sans"', '400 1em "Pretendard Variable"', '700 1em "Pretendard Variable"']
    for (const f of fonts) void document.fonts?.load(f, '가A1').catch(() => {})
  } catch {
    // 글꼴 미리 받기를 못 해도 체험은 계속됩니다
  }
}
