import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 우클릭 / 롱프레스 컨텍스트 메뉴 차단
document.addEventListener('contextmenu', (e) => e.preventDefault())
// 두 손가락 확대 제스처 차단 (iOS Safari)
document.addEventListener('gesturestart', (e) => e.preventDefault())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
