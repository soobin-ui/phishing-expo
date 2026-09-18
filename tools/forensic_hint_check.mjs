/**
 * 포렌식 수사 — 조사 시간 · 힌트 검사 (개발용).
 *
 *   node tools/forensic_hint_check.mjs http://localhost:8899/
 *
 * ① 힌트를 누르면 앱 아이콘 → 대화방 → 말풍선이 차례로 반짝이는지
 * ② 남은 시간이 줄어드는지, 25초 동안 못 찾으면 힌트 버튼이 반짝이는지(시계를 빨리 돌려 확인)
 * ③ 시간이 다 되면 '증거가 부족합니다' 검거 카드로 넘어가는지
 */
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv.find((a) => a.startsWith('http')) ?? 'http://localhost:8899/'
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'shots', 'forensic')
mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true })
const results = []
const check = (name, ok) => results.push(`${ok ? '✓' : '✗'} ${name}`)

async function open(fast) {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
  if (fast) await page.evaluateOnNewDocument(() => { const si = window.setInterval; window.setInterval = (fn, ms, ...a) => si(fn, ms === 1000 ? 20 : ms, ...a) })
  await page.goto(`${URL}?topic=job&name=수사관&t=${Date.now()}`, { waitUntil: 'networkidle0' })
  await page.click('[data-role="rules-start"]'); await wait(400)
  await page.click('[data-role="unlock"]'); await wait(300)
  return { page, errors }
}

// ① 힌트 길 안내
{
  const { page, errors } = await open(false)
  const t0 = await page.$eval('.timer b', (e) => e.textContent)
  await page.click('[data-role="hint"]'); await wait(300)
  check('힌트 → 메시지 앱 반짝', await page.$eval('[data-app="sms"]', (e) => e.classList.contains('hl')))
  await page.screenshot({ path: join(OUT, '힌트-1-home.png') })
  await page.click('[data-app="sms"]'); await wait(200)
  check('힌트 → 인사팀 문자방 반짝', await page.$eval('[data-go="sms_scam"]', (e) => e.classList.contains('hl')))
  await page.click('[data-go="sms_scam"]'); await wait(200)
  const bub = await page.$$eval('.bub.hl', (x) => x.map((e) => e.textContent))
  check('힌트 → 카톡 유도 말풍선만 반짝', bub.length === 1 && bub[0].includes('카카오톡 ID'))
  await page.screenshot({ path: join(OUT, '힌트-2-bubble.png') })
  await page.evaluate(() => document.querySelector('.bub.hl').click()); await wait(3200)
  check('증거 찾으면 힌트 꺼짐', (await page.$$('.hl')).length === 0)
  const t1 = await page.$eval('.timer b', (e) => e.textContent)
  check(`남은 시간 줄어듦 (${t0} → ${t1})`, t0 !== t1)
  check('오류 없음', !errors.length)
  await page.close()
}

// ②③ 시계를 빨리 돌려서
{
  const { page, errors } = await open(true)
  await wait(700) // 약 35초 경과
  check('25초 동안 못 찾으면 힌트 버튼 반짝', await page.$eval('[data-role="hint"]', (e) => e.classList.contains('nudge')))
  await page.screenshot({ path: join(OUT, '힌트-3-nudge.png') })
  await wait(2600) // 시간 끝
  await wait(4500)
  const text = await page.evaluate(() => document.body.innerText)
  check('시간 끝 → 증거가 부족합니다 카드', text.includes('증거가 부족합니다') && text.includes('조사 시간이 끝났습니다'))
  await page.screenshot({ path: join(OUT, '힌트-4-timeout.png') })
  check('오류 없음(빠른 시계)', !errors.length)
  await page.close()
}
await browser.close()
console.log(results.join('\n'))
