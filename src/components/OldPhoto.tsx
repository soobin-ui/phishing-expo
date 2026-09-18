/**
 * 빛바랜 옛날 학교 사진 — 스미싱 문자의 링크 미리보기·가짜 사진 공유 페이지에 씁니다.
 * 외부 이미지를 받아오지 않도록(전시장 오프라인) 전부 SVG 로 그립니다.
 *   0 벚꽃 핀 학교 건물 · 1 운동장 단체 사진 · 2 교실 창가
 */
export function OldPhoto({ variant = 0, className = '' }: { variant?: 0 | 1 | 2; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`opSky${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9d8e6" />
          <stop offset="1" stopColor="#efe6d6" />
        </linearGradient>
        <radialGradient id={`opVig${variant}`} cx="50%" cy="50%" r="72%">
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#3b2a16" stopOpacity="0.45" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" fill={`url(#opSky${variant})`} />

      {variant === 0 && (
        <>
          {/* 학교 건물 */}
          <rect x="18" y="56" width="92" height="40" fill="#d9d2c3" />
          <rect x="18" y="52" width="92" height="6" fill="#b9b09c" />
          {[0, 1, 2].map((r) =>
            [0, 1, 2, 3, 4, 5, 6].map((c) => (
              <rect key={`${r}-${c}`} x={23 + c * 12.4} y={61 + r * 11} width="8" height="7" fill="#7f95a3" opacity="0.85" />
            )),
          )}
          <rect x="58" y="80" width="12" height="16" fill="#8a7d68" />
          {/* 운동장 */}
          <rect x="0" y="96" width="120" height="24" fill="#d8c7a3" />
          {/* 벚나무 */}
          <path d="M8 120C10 92 12 78 22 60M22 60C14 50 8 44 0 40M22 60c6-10 12-16 22-20M16 78c-6-6-10-8-16-10" stroke="#5b4636" strokeWidth="3" fill="none" strokeLinecap="round" />
          {[
            [6, 36, 13], [20, 28, 15], [36, 34, 13], [50, 26, 12], [12, 50, 11], [30, 46, 12], [46, 42, 10], [2, 62, 10], [62, 32, 9],
          ].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? '#f6dbe4' : '#fbeaf0'} opacity="0.92" />
          ))}
        </>
      )}

      {variant === 1 && (
        <>
          <rect x="0" y="40" width="120" height="30" fill="#cfc7b6" />
          <rect x="0" y="70" width="120" height="50" fill="#d8c7a3" />
          {/* 단체 사진 — 세 줄 */}
          {[0, 1, 2].map((row) =>
            Array.from({ length: 7 - row }, (_, i) => {
              const x = 14 + row * 7 + i * 15
              const y = 98 - row * 15
              return (
                <g key={`${row}-${i}`}>
                  <rect x={x - 5} y={y} width="10" height="16" rx="3" fill={(i + row) % 2 ? '#5d6b86' : '#f1efe9'} />
                  <circle cx={x} cy={y - 5} r="4.6" fill="#e6c9a8" />
                  <path d={`M${x - 4.6} ${y - 6}a4.6 4.6 0 019.2 0z`} fill="#3a2e24" />
                </g>
              )
            }),
          )}
        </>
      )}

      {variant === 2 && (
        <>
          <rect width="120" height="120" fill="#e9dfcb" />
          {/* 교실 창 */}
          <rect x="10" y="14" width="100" height="56" fill="#cfe0ea" stroke="#9a8a70" strokeWidth="3" />
          <path d="M60 14v56M10 42h100" stroke="#9a8a70" strokeWidth="3" />
          <circle cx="92" cy="28" r="12" fill="#fbeaf0" opacity="0.9" />
          <circle cx="78" cy="34" r="9" fill="#f6dbe4" opacity="0.9" />
          {/* 책상 */}
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={10 + i * 38} y="88" width="28" height="5" fill="#a9825a" />
              <rect x={13 + i * 38} y="93" width="3" height="18" fill="#7d5f40" />
              <rect x={32 + i * 38} y="93" width="3" height="18" fill="#7d5f40" />
            </g>
          ))}
        </>
      )}

      {/* 빛바램 + 가장자리 어둡게 */}
      <rect width="120" height="120" fill="#c9a36b" opacity="0.2" />
      <rect width="120" height="120" fill={`url(#opVig${variant})`} />
    </svg>
  )
}
