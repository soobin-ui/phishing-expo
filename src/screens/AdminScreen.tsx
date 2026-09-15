import { useState } from 'react'
import { TapButton } from '../components/Buttons'
import { ScrollScreen } from '../components/Stage'
import { clearRecords, downloadCsv, loadRecords, todayRecords } from '../lib/stats'

/** 운영자 화면 — 우측 상단 구석 5회 탭으로 진입. Phase 8에서 통계 항목을 완성합니다. */
export function AdminScreen({ onExit }: { onExit: () => void }) {
  const [tick, setTick] = useState(0)
  const all = loadRecords()
  const today = todayRecords()
  const completed = today.filter((r) => r.completed)
  const avgSec = completed.length
    ? Math.round(completed.reduce((sum, r) => sum + r.durationMs, 0) / completed.length / 1000)
    : 0
  const completionRate = today.length ? Math.round((completed.length / today.length) * 100) : 0
  const defendRate = completed.length
    ? Math.round((completed.filter((r) => r.defended).length / completed.length) * 100)
    : 0

  return (
    <ScrollScreen>
    <div className="mx-auto flex w-full max-w-[52rem] flex-1 flex-col gap-4 px-5 py-8" key={tick}>
      <h2 className="font-display text-[1.5rem] font-bold">운영자 화면</h2>

      <div className="grid grid-cols-2 gap-3 wide:grid-cols-4">
        <Stat label="오늘 체험" value={`${today.length}명`} />
        <Stat label="완주율" value={`${completionRate}%`} />
        <Stat label="평균 소요" value={`${avgSec}초`} />
        <Stat label="방어 성공률" value={`${defendRate}%`} />
      </div>

      <p className="text-[0.95rem] leading-snug text-white/45">
        누적 기록 {all.length}건 · 이 태블릿에만 저장됩니다. 행사 후 태블릿마다 CSV를 내려받아
        합치세요.
      </p>

      <div className="mt-auto flex flex-col gap-3 pt-4">
        <TapButton onClick={() => downloadCsv(all)}>
          CSV 내려받기 ({all.length}건)
        </TapButton>
        <TapButton
          tone="ghost"
          onClick={() => {
            if (window.confirm('오늘까지의 모든 기록을 지웁니다. 계속할까요?')) {
              clearRecords()
              setTick((t) => t + 1)
            }
          }}
        >
          통계 초기화
        </TapButton>
        <TapButton tone="ghost" onClick={onExit}>
          나가기
        </TapButton>
      </div>
    </div>
    </ScrollScreen>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3">
      <p className="text-[0.9rem] text-white/45">{label}</p>
      <p className="font-display text-[1.6rem] font-bold tabular-nums">{value}</p>
    </div>
  )
}
