import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // 전시장 태블릿에서 어느 경로에 올려도 열리도록 상대경로 빌드
  base: './',
  plugins: [react(), tailwindcss()],
  server: { host: true, port: 5173 },
})
