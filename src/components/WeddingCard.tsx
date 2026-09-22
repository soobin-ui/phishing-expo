/**
 * 모바일 청첩장 그림 — 청첩장 스미싱 문자의 링크 미리보기·가짜 본인확인 페이지에 씁니다.
 * 외부 이미지를 받아오지 않도록(전시장 오프라인) 전부 SVG 로 그립니다.
 * 웨딩 사진 느낌: 연분홍 바탕 + 턱시도 신랑 · 면사포 신부 + 'Wedding Invitation'.
 * ★ 신랑·신부 이름은 일부러 없습니다 — "이름 없는 초대"가 이 사건의 단서입니다(build_scenarios.py no_name).
 * 작은 썸네일(4.6rem)에서도 두 사람이 보이도록 인물은 크게, 글자는 아래 띠에만.
 * 화면 비율은 4:3(160×120) — 가짜 페이지 카드 비율. 정사각 썸네일에서는 양옆 빛망울만 잘립니다(slice).
 */
export function WeddingCard({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="wcBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff4f1" />
          <stop offset="1" stopColor="#f8dfe6" />
        </linearGradient>
        <radialGradient id="wcGlow" cx="50%" cy="38%" r="55%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="160" height="120" fill="url(#wcBg)" />
      <rect width="160" height="120" fill="url(#wcGlow)" />
      {/* 빛망울 */}
      {[
        [24, 22, 7], [128, 18, 5], [136, 52, 4], [14, 60, 4], [118, 34, 3], [34, 40, 3], [8, 30, 3], [150, 40, 5], [146, 78, 3],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity="0.55" />
      ))}
      {/* 꽃잎 몇 장 */}
      {[
        [26, 78, -20], [124, 70, 25], [40, 30, 40], [116, 86, -35], [10, 88, 15], [148, 60, -25],
      ].map(([x, y, a], i) => (
        <ellipse key={i} cx={x} cy={y} rx="3.2" ry="1.8" fill="#f4b6c4" opacity="0.8" transform={`rotate(${a} ${x} ${y})`} />
      ))}

      {/* ── 신랑 (왼쪽) ── 인물은 원래 120 기준으로 그려 두고 가운데(+20)로 옮깁니다 */}
      <g transform="translate(20 0)">
        {/* 몸: 검정 턱시도 */}
        <path d="M31 96c0-18 6-30 16-32h2c10 2 16 14 16 32z" fill="#2a2f45" />
        {/* 셔츠 */}
        <path d="M45 64h8l-4 22z" fill="#fff" />
        {/* 나비넥타이 */}
        <path d="M45.5 66.5l3.5 1.6 3.5-1.6v3.4l-3.5-1.6-3.5 1.6z" fill="#c94c5a" />
        {/* 목 */}
        <rect x="46" y="58" width="6" height="7" rx="2" fill="#f2cfb2" />
        {/* 얼굴 */}
        <circle cx="49" cy="49" r="11" fill="#f6d7bd" />
        {/* 머리 */}
        <path d="M38.5 47c1-9 6-13 11-13s10 4 10.5 13c-3-4-6-6-10.5-6s-8 2-11 6z" fill="#3a2a25" />
        {/* 눈·미소 */}
        <circle cx="45" cy="49.5" r="1.1" fill="#3a2a25" />
        <circle cx="53" cy="49.5" r="1.1" fill="#3a2a25" />
        <path d="M46 54q3 2.4 6 0" stroke="#b97a6a" strokeWidth="1" fill="none" strokeLinecap="round" />
        <circle cx="43.5" cy="52.5" r="1.4" fill="#f4a8b0" opacity="0.7" />
        <circle cx="54.5" cy="52.5" r="1.4" fill="#f4a8b0" opacity="0.7" />
        {/* 부토니에 */}
        <circle cx="41.5" cy="71" r="1.8" fill="#f28ea0" />
      </g>

      {/* ── 신부 (오른쪽) ── */}
      <g transform="translate(20 0)">
        {/* 면사포 */}
        <path d="M60 60c0-14 6-24 13-27 8 2 15 12 16 30-4 6-6 22-4 33H58c2-12 0-26 2-36z" fill="#fff" opacity="0.75" />
        {/* 드레스 */}
        <path d="M58 96c1-20 6-31 13-33h3c8 2 12 13 13 33z" fill="#fffdfa" />
        <path d="M62 96c1-12 4-20 9-23h3c5 3 8 11 9 23z" fill="#f7eef0" opacity="0.7" />
        {/* 목 */}
        <rect x="70" y="58" width="6" height="7" rx="2" fill="#f2cfb2" />
        {/* 얼굴 */}
        <circle cx="73" cy="49" r="11" fill="#f8dcc4" />
        {/* 머리(갈색) — 앞머리 + 옆머리 */}
        <path d="M62.5 48c.5-9 5-13.5 10.5-13.5S83.5 39 84 48c-2.5-3.5-5.5-5.5-11-5.5s-8 2-10.5 5.5z" fill="#5a3a2e" />
        <path d="M62.5 48c-1 5-.5 9 1 12 1-4 1-8 0-12z" fill="#5a3a2e" />
        <path d="M83.5 48c1 5 .5 9-1 12-1-4-1-8 0-12z" fill="#5a3a2e" />
        {/* 화관 */}
        {[65.5, 69, 72.5, 76, 79.5].map((x, i) => (
          <circle key={i} cx={x} cy={38.5 - Math.abs(i - 2) * 0.6} r="1.7" fill={i % 2 ? '#fff' : '#f7b3c2'} />
        ))}
        {/* 눈·미소 */}
        <circle cx="69" cy="49.5" r="1.1" fill="#3a2a25" />
        <circle cx="77" cy="49.5" r="1.1" fill="#3a2a25" />
        <path d="M70 54q3 2.4 6 0" stroke="#c9707d" strokeWidth="1" fill="none" strokeLinecap="round" />
        <circle cx="67.5" cy="52.5" r="1.4" fill="#f4a8b0" opacity="0.8" />
        <circle cx="78.5" cy="52.5" r="1.4" fill="#f4a8b0" opacity="0.8" />
        {/* 부케 */}
        <g>
          {[[72, 79], [76, 77], [80, 79], [74, 82.5], [78, 82.5]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3" fill={i % 2 ? '#f48fa3' : '#fbc4d0'} />
          ))}
          <circle cx="70" cy="81" r="2.2" fill="#9fc29b" />
          <circle cx="82.5" cy="82" r="2.2" fill="#9fc29b" />
        </g>
      </g>

      {/* 둘 사이 하트 */}
      <path transform="translate(20 0)" d="M61 41.5c-1.6-2.2-4.6-.6-3.8 1.6.5 1.4 2.2 2.6 3.8 3.8 1.6-1.2 3.3-2.4 3.8-3.8.8-2.2-2.2-3.8-3.8-1.6z" fill="#ec5d78" />

      {/* 아래 띠 */}
      <rect x="0" y="96" width="160" height="24" fill="#fff" opacity="0.92" />
      <text x="80" y="106" textAnchor="middle" fontSize="6.6" fontFamily="Georgia, 'Times New Roman', serif" fontStyle="italic" fill="#8a6d3b">
        Wedding Invitation
      </text>
      <text x="80" y="115" textAnchor="middle" fontSize="5.6" fontFamily="sans-serif" fontWeight="700" fill="#5b4a33">
        결혼식에 초대합니다
      </text>
    </svg>
  )
}
