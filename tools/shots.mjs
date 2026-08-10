/**
 * 화면을 실제로 찍어봅니다 (개발용).
 *
 *   npm run shots
 *
 * 결과는 tools/shots/ 에 PNG 로 떨어집니다.
 * PC에 설치된 크롬을 그대로 쓰므로 따로 받을 게 없습니다.
 */
import { mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const URL = process.argv[2] || 'http://localhost:8899/'
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'shots')

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--hide-scrollbars'],
})

const page = await browser.newPage()
// 태블릿 세로. Stage 가 9:16 으로 잡아주므로 그 비율로 봅니다.
await page.setViewport({ width: 810, height: 1440, deviceScaleFactor: 1, isMobile: true, hasTouch: true })

let n = 0
const shot = async (name) => {
  n += 1
  const file = join(OUT, `${String(n).padStart(2, '0')}-${name}.png`)
  await page.screenshot({ path: file })
  console.log('  ', file.split(/[\\/]/).pop())
}

/** 화면에 보이는 글자로 버튼·요소를 찾아 누릅니다. */
const tapText = (text) =>
  page.evaluate((t) => {
    const el = [...document.querySelectorAll('button')].find((b) => b.innerText.includes(t))
    if (!el) throw new Error(`"${t}" 를 찾지 못했습니다`)
    el.click()
  }, text)

const reload = async () => {
  await page.goto(URL + '?t=' + Date.now(), { waitUntil: 'networkidle0' })
  await wait(700)
}

console.log('열기:', URL)
await reload()

// [0] 첫 화면
await shot('menu')

// ── A. 시나리오 체험 ─────────────────────────────
await tapText('시나리오 체험')
await wait(700)
await shot('age')

await tapText('40 · 50대')
await wait(1400)
await shot('chat-turn1')

// 첫 선택 → 두 번째 문자
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')].filter((b) => b.innerText.trim().length > 4)
  btns[1]?.click()
})
await wait(2000)
await shot('chat-turn2')

// 두 번째 선택 → 당함 → 위험 신호 찾기
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')].filter((b) => b.innerText.trim().length > 4)
  btns[0]?.click()
})
await wait(1200)
await shot('caught')
await wait(2000)
await shot('redflag')

// 정답 3개를 눌러본다
await page.evaluate(() => {
  document.querySelectorAll('span.cursor-pointer').forEach((el) => el.click())
  const header = document.querySelector('.border-b button, button.mb-3')
  if (header) header.click()
})
await wait(900)
await shot('redflag-found')

await tapText('다음')
await wait(800)
await shot('result-chat')

// ── B. 피싱 찾기 퀴즈 ────────────────────────────
await tapText('처음으로')
await wait(800)
await tapText('피싱 찾기 퀴즈')
await wait(900)
await shot('quiz1')

await page.evaluate(() => {
  document.querySelectorAll('span.cursor-pointer').forEach((el) => el.click())
  const header = document.querySelector('button.mb-3')
  if (header) header.click()
})
await wait(900)
await shot('quiz1-found')

await tapText('다음 문자')
await wait(900)
await shot('quiz2')

await page.evaluate(() => {
  document.querySelectorAll('span.cursor-pointer').forEach((el) => el.click())
  const header = document.querySelector('button.mb-3')
  if (header) header.click()
})
await wait(900)
await shot('quiz2-found')

await tapText('결과 보기')
await wait(800)
await shot('result-quiz')

await browser.close()
console.log('완료 →', OUT)
