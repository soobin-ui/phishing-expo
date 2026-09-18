/**
 * 스크롤 상자 안에서만 요소를 가운데로 보이게 합니다.
 *
 * ★ element.scrollIntoView() 를 쓰면 안 됩니다 — 바깥 무대(Stage)가 overflow:hidden 이어도
 *   브라우저가 그 무대까지 같이 밀어 올려 제목·버튼이 화면 밖으로 사라집니다(2026-09-18 실측).
 *   그래서 넘겨받은 상자의 scrollTop 만 움직입니다.
 *
 * zoom — 상자 안쪽에 CSS zoom 을 걸었으면 그 값(getBoundingClientRect 는 확대된 좌표, scrollTop 은 원래 좌표).
 */
export function scrollToWithin(
  container: HTMLElement | null,
  el: Element | null,
  zoom = 1,
  behavior: ScrollBehavior = 'smooth',
) {
  if (!container || !el) return
  const c = container.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  const elTop = container.scrollTop + (r.top - c.top) / zoom
  const elH = r.height / zoom
  const top = elTop - (container.clientHeight - elH) / 2
  container.scrollTo({ top: Math.max(0, top), behavior })
}
