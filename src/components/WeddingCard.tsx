/**
 * 모바일 청첩장 그림 — 청첩장 스미싱 문자의 링크 미리보기·가짜 본인확인 페이지에 씁니다.
 * 외부 이미지를 받아오지 않도록(전시장 오프라인) 전부 SVG 로 그립니다.
 * 아이보리 카드 + 잎 장식 + 반지 두 개 + 'Wedding Invitation' 글자. 신랑·신부 이름은 일부러 없습니다(그게 단서).
 */
export function WeddingCard({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="wcBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbf6ea" />
          <stop offset="1" stopColor="#f1e6d2" />
        </linearGradient>
        <linearGradient id="wcGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e2c27a" />
          <stop offset="1" stopColor="#b8923f" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" fill="url(#wcBg)" />
      {/* 안쪽 테두리 */}
      <rect x="9" y="9" width="102" height="102" rx="4" fill="none" stroke="#d9c39a" strokeWidth="1.2" />
      <rect x="12.5" y="12.5" width="95" height="95" rx="3" fill="none" stroke="#d9c39a" strokeWidth="0.6" />

      {/* 잎 장식 — 왼쪽 위·오른쪽 아래 */}
      {[
        { x: 14, y: 14, r: 0 },
        { x: 106, y: 106, r: 180 },
      ].map((g, i) => (
        <g key={i} transform={`translate(${g.x} ${g.y}) rotate(${g.r})`}>
          <path d="M0 0c8 2 14 8 16 16" stroke="#8fa37c" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          {[2, 6, 10].map((t, k) => (
            <ellipse key={k} cx={t + 2} cy={t * 0.9 + 1} rx="3.2" ry="1.7" fill="#a8bb93" transform={`rotate(${35 + k * 8} ${t + 2} ${t * 0.9 + 1})`} />
          ))}
          <ellipse cx="9" cy="3" rx="1.8" ry="1.8" fill="#e8b4b8" />
        </g>
      ))}

      {/* 반지 두 개 */}
      <circle cx="53" cy="52" r="11" fill="none" stroke="url(#wcGold)" strokeWidth="3.2" />
      <circle cx="67" cy="52" r="11" fill="none" stroke="url(#wcGold)" strokeWidth="3.2" />
      <path d="M66 40.5l2.3 2.6-2.3 2.6-2.3-2.6z" fill="#fff" stroke="#b8923f" strokeWidth="0.6" />

      {/* 글자 */}
      <text x="60" y="78" textAnchor="middle" fontSize="7.2" fontFamily="Georgia, 'Times New Roman', serif" fontStyle="italic" fill="#8a6d3b">
        Wedding Invitation
      </text>
      <text x="60" y="90" textAnchor="middle" fontSize="6.4" fontFamily="sans-serif" fontWeight="700" fill="#5b4a33">
        결혼식에 초대합니다
      </text>
      <line x1="42" y1="95.5" x2="78" y2="95.5" stroke="#d9c39a" strokeWidth="0.8" />
    </svg>
  )
}
