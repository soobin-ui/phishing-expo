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
/*
  화면 크기. 기본은 태블릿 세로(810×1440)입니다.
  ★ 다른 크기로도 꼭 한 번씩 찍어보세요. 무대를 통째로 축소하는 방식이라
    비율만 작아져야 정상이고, 글자가 겹치면 그건 버그입니다.
      npm run shots -- <주소> 390x844      (휴대폰)
      npm run shots -- <주소> 1024x768     (가로로 눕힌 태블릿)
*/
const [vw, vh] = (process.argv[3] || '810x1440').split('x').map(Number)
await page.setViewport({ width: vw, height: vh, deviceScaleFactor: 1, isMobile: true, hasTouch: true })

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
await wait(1800)
await shot('chat-turn1')

/** 관람객처럼 한 글자씩 직접 쳐 넣습니다 */
const typeReply = async (text) => {
  await page.click('input')
  await page.type('input', text, { delay: 25 })
}

// 첫 답장 — 넘어가는 쪽
await typeReply('알겠어 어떻게 하면 돼?')
await wait(300)
await shot('chat-typed')
await tapText('보내기')
await wait(2400)
await shot('chat-turn2')

// 두 번째 답장 — 계좌번호를 그대로 적어버리는 최악의 경우
await typeReply('국민 110-234-567890 으로 보낼게')
await tapText('보내기')
await wait(1400)
await shot('caught')
await wait(2200)
await shot('debrief')
await wait(2600)
await shot('debrief-full')

await tapText('다음')
await wait(900)
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
