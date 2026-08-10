import type { RedFlag } from '../types'

export type Segment = { text: string; flag?: RedFlag }

/** 메시지 본문에서 위험 신호에 해당하는 글자를 잘라내 '누를 수 있는 조각'으로 나눕니다. */
export function splitByFlags(text: string, flags: RedFlag[]): Segment[] {
  const hits: Array<{ start: number; end: number; flag: RedFlag }> = []
  for (const flag of flags) {
    const start = text.indexOf(flag.match)
    if (start >= 0) hits.push({ start, end: start + flag.match.length, flag })
  }
  hits.sort((a, b) => a.start - b.start)

  const segments: Segment[] = []
  let cursor = 0
  for (const hit of hits) {
    if (hit.start < cursor) continue // 겹치면 건너뜀
    if (hit.start > cursor) segments.push({ text: text.slice(cursor, hit.start) })
    segments.push({ text: text.slice(hit.start, hit.end), flag: hit.flag })
    cursor = hit.end
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) })
  return segments
}
