import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** 빌드한 시각(한국 시간, "MM-DD HH:mm") — 첫 화면 구석에 작게 찍혀, 태블릿이 최신 버전인지 현장에서 확인할 수 있습니다 */
const BUILD = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(5, 16)

export default defineConfig({
  define: { __BUILD__: JSON.stringify(BUILD) },
  // 전시장 태블릿에서 어느 경로에 올려도 열리도록 상대경로 빌드
  base: './',
  plugins: [react(), tailwindcss()],
  server: { host: true, port: 5173 },
})
