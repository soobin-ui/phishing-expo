/**
 * 취업·채용 포렌식 수사 끝까지 주행 + 캡처 (개발용).
 *
 *   node tools/forensic_shots.mjs http://localhost:8899/
 *
 * 규칙 → 잠금화면 → 헛짚기 1번 → 증거 4개(문자 1 · 카톡 3) → 증거 수집 완료
 * → 폴더 → 보드(순서 한 번 틀리고 바로잡기) → 검거 카드 → 뒷면 → 이렇게 예방하세요 → tools/shots/forensic/
 */
import { mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv.find((a) => a.startsWith('http')) ?? 'http://localhost:8899/'
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'shots', 'forensic')
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const DEVICES = [['폰', 390, 844, true], ['작은폰', 360, 640, true], ['탭세로', 820, 1180, true], ['노트북', 1366, 768, false]]

for (const [label, w, h, mobile] of DEVICES) {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewport({ width: w, height: h, isMobile: mobile, hasTouch: mobile })
  await page.goto(`${URL}?topic=job&name=수사관&t=${Date.now()}`, { waitUntil: 'networkidle0' })
  await page.evaluate(() => document.fonts.ready)
  const shot = (n) => page.screenshot({ path: join(OUT, `${label}-${n}.png`) })
  const tapText = (t) => page.evaluate((t) => [...document.querySelectorAll('[data-i]')].find((x) => x.textContent.includes(t)).click(), t)
  const offscreen = () => page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => { const r = b.getBoundingClientRect(); return r.width && (r.bottom > innerHeight + 1 || r.right > innerWidth + 1) && !b.closest('.body') }).map((b) => b.innerText.slice(0, 12)))
  const problems = []
  await page.waitForSelector('[data-role="rules-start"]'); await wait(900)
  problems.push(...(await offscreen()).map((t) => '규칙:' + t)); await shot('0-rules')
  await page.click('[data-role="rules-start"]'); await wait(500)
  problems.push(...(await offscreen()).map((t) => '잠금:' + t)); await shot('1-lock')
  await page.click('[data-role="unlock"]'); await wait(300); await shot('2-home')
  await page.click('[data-app="sms"]'); await wait(200)
  await page.click('[data-go="sms_parcel"]'); await wait(200); await tapText('배송 완료'); await wait(400)
  await page.click('[data-role="nav-back"]'); await wait(200)
  await page.click('[data-go="sms_scam"]'); await wait(200); await tapText('카카오톡 ID'); await wait(900); await shot('3-snap')
  await wait(2300)
  await page.click('[data-role="nav-home"]'); await wait(200); await page.click('[data-app="talk"]'); await wait(200); await page.click('[data-go="talk_scam"]'); await wait(200)
  for (const t of ['haeon-interview', '모두 허용해', '482913']) { await tapText(t); await wait(3100) }
  await wait(700)
  const done = !!(await page.$('[data-role="evidence-done"]'))
  await shot('4-done')
  await page.click('[data-role="folder"]'); await wait(700)
  problems.push(...(await offscreen()).map((t) => '보드:' + t)); await shot('5-board')
  await page.click('[data-k="2"]'); await wait(300)
  for (const k of [0, 1, 2, 3]) { await page.click(`[data-k="${k}"]`); await wait(600) }
  await wait(1500); await shot('6-closed')
  await page.click('[data-role="board-next"]'); await wait(3800); await shot('7-card')
  await page.click('[data-role="flip-card"]'); await wait(1400); await shot('8-back')
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.includes('이렇게 예방'))?.click()); await wait(1500)
  const action = await page.evaluate(() => document.body.innerText.includes('수사 종료'))
  await shot('9-action')
  const ok = done && action && !problems.length && !errors.length
  console.log(`${ok ? '✓' : '✗'} ${label} · 수집완료 ${done} · 마지막 화면 ${action}${problems.length ? ' · ' + problems.join(', ') : ''}${errors.length ? ' · 오류 ' + errors.join(' / ') : ''}`)
  await browser.close()
}
