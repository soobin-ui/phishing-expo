import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { installKiosk } from './lib/viewport'

// 보이는 높이 재기(--app-h) + 전체화면 되돌리기 — 어떤 노트북·태블릿이든 화면이 잘리지 않게
installKiosk()

// 우클릭 / 롱프레스 컨텍스트 메뉴 차단
document.addEventListener('contextmenu', (e) => e.preventDefault())
// 두 손가락 확대 제스처 차단 (iOS Safari)
document.addEventListener('gesturestart', (e) => e.preventDefault())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 어떤 화면에서 오류가 나도 빈 화면으로 멈추지 않고 처음 화면으로 자동 복구 */}
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
