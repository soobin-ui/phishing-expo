import type { SessionRecord } from '../types'

/**
 * 집계 통계는 이 태블릿의 localStorage에만 쌓입니다(서버 없음).
 * 행사 후 태블릿마다 운영자 화면에서 CSV를 내려받아 합치면 됩니다.
 * 개인을 알아볼 수 있는 정보는 저장하지 않습니다.
 */
const KEY = 'phishing-expo:sessions:v1'

export function loadRecords(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as SessionRecord[]) : []
  } catch {
    return []
  }
}

export function saveRecord(record: SessionRecord): void {
  try {
    const all = loadRecords()
    all.push(record)
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    // 저장 공간이 꽉 차도 체험은 계속되어야 합니다.
  }
}

export function clearRecords(): void {
  localStorage.removeItem(KEY)
}

/** 오늘(자정 기준) 기록만 */
export function todayRecords(): SessionRecord[] {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  return loadRecords().filter((r) => r.startedAt >= start.getTime())
}

export function newSessionId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export function toCsv(records: SessionRecord[]): string {
  const header = [
    'session_id',
    'started_at',
    'duration_sec',
    'completed',
    'situation',
    'scenario',
    'flags_found',
    'flags_total',
    'defended',
  ]
  const rows = records.map((r) => [
    r.sessionId,
    new Date(r.startedAt).toISOString(),
    Math.round(r.durationMs / 1000),
    r.completed ? 'Y' : 'N',
    r.situation,
    r.scenarioId,
    r.flagsFound,
    r.flagsTotal,
    r.defended ? 'Y' : 'N',
  ])
  return [header, ...rows].map((cols) => cols.join(',')).join('\n')
}

export function downloadCsv(records: SessionRecord[]): void {
  const blob = new Blob(['﻿' + toCsv(records)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `phishing-expo-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
