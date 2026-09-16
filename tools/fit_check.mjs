/**
 * 전 화면 × 기기 크기 넘침 검사 + 캡처 (개발용).
 *
 *   node tools/fit_check.mjs http://localhost:8899/
 *   node tools/fit_check.mjs <URL> --shots      # 기기마다 전 화면 PNG → tools/shots/fit/
 *
 * 휴대폰·태블릿(세로/가로)·노트북·큰 모니터에서 체험 전 구간을 한 번씩 주행하며
 *   - 가로 넘침(옆으로 밀림)        → 있으면 무조건 버그
 *   - 세로 넘침(화면 안 스크롤 필요) → 휴대폰 가로·아주 작은 폰은 허용, 나머지는 경고
 *   - 채팅 입력창·보내기 버튼이 화면 안에 있는지
 * 를 봅니다.
 */
import { mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const args = process.argv.slice(2)
const URL = args.find((a) => a.startsWith('http')) ?? 'http://localhost:8899/'
const SHOTS = args.includes('--shots')
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'shots', 'fit')
if (SHOTS) {
  rmSync(OUT, { recursive: true, force: true })
  mkdirSync(OUT, { recursive: true })
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

/** [이름, 폭, 높이, 모바일 여부, 세로 넘침 허용] */
const DEVICES = [
  ['폰-SE-375x667', 375, 667, true, false],
  ['폰-360x740', 360, 740, true, false],
  ['폰-390x844', 390, 844, true, false],
  ['폰가로-844x390', 844, 390, true, true],
  ['탭세로-800x1280', 800, 1280, true, false],
  ['탭세로-820x1180', 820, 1180, true, false],
  ['탭세로-1024x1366', 1024, 1366, true, false],
  ['탭가로-1280x800', 1280, 800, true, false],
  ['탭가로-1180x820', 1180, 820, true, false],
  ['노트북-1366x768', 1366, 768, false, false],
  ['노트북-1440x900', 1440, 900, false, false],
  ['모니터-1920x1080', 1920, 1080, false, false],
]

const REPLIES = [
  '네 확인했습니다',
  '한빛대학교 김OO 입니다',
  '지금 접속해볼게요',
  '하나 210-889-334512 입니다',
  '알겠습니다 바로 하겠습니다',
]

/** 지금 화면의 넘침을 잽니다 */
const measure = (page) =>
  page.evaluate(() => {
    const W = innerWidth
    const H = innerHeight
    const out = { hOverflow: 0, vOverflow: 0, offscreen: [] }
    out.hOverflow = Math.max(0, document.documentElement.scrollWidth - W)
    const sc = document.querySelector('[data-scroll-screen]')
    if (sc) out.vOverflow = Math.max(0, sc.scrollHeight - sc.clientHeight)
    // 버튼·입력창이 화면 밖으로 삐져나갔는지 (스크롤 화면 밖에서)
    if (!sc) {
      document.querySelectorAll('button, input').forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.width === 0 || el.getAttribute('aria-hidden')) return
        if (r.right > W + 1 || r.bottom > H + 1 || r.left < -1 || r.top < -1)
          out.offscreen.push((el.innerText || el.placeholder || el.tagName).slice(0, 14))
      })
    }
    return out
  })

const tapText = (page, text) =>
  page.evaluate((t) => {
    const el = [...document.querySelectorAll('button')].find((b) => b.innerText.includes(t))
    if (!el) throw new Error(`"${t}" 를 찾지 못했습니다`)
    el.click()
  }, text)

console.log(`검사 대상: ${URL}\n`)

/*
  ★ 기기마다 브라우저를 따로 띄웁니다.
    한 브라우저에 탭 여러 개를 열면 앞에 있는 탭 하나만 애니메이션이 돌고
    나머지는 멈춰서, 글자가 반쯤 투명한 채로 찍힙니다.
*/
async function run([label, w, h, mobile, allowV]) {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--hide-scrollbars'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile })
  await page.goto(URL + '?t=' + Date.now(), { waitUntil: 'networkidle0' })
  await page.evaluate(() => document.fonts.ready)
  await wait(1200)

  const rows = []
  const check = async (screen) => {
    const m = await measure(page)
    const problems = []
    if (m.hOverflow) problems.push(`가로 넘침 ${m.hOverflow}px`)
    if (m.vOverflow && !allowV) problems.push(`세로 넘침 ${m.vOverflow}px`)
    if (m.offscreen.length) problems.push(`화면 밖: ${m.offscreen.join(', ')}`)
    rows.push({ screen, problems, v: m.vOverflow })
    if (SHOTS) await page.screenshot({ path: join(OUT, `${label}-${screen}.png`) })
  }

  await check('1-menu')
  // 타이핑으로 진행되는 주제로 훑습니다(메일은 받은편지함·선택 방식이라 흐름이 다름)
  await tapText(page, '학회 · 논문')
  await wait(1200)
  await check('2-arrive')
  await page.click('[data-role="open-channel"]')
  await wait(1900)
  await check('3-chat')

  for (let i = 0; i < REPLIES.length; i += 1) {
    await page.waitForFunction(() => {
      const el = document.querySelector('input')
      return el && !el.disabled
    }, { timeout: 10000 })
    await page.click('input')
    await page.type('input', REPLIES[i], { delay: 5 })
    await page.keyboard.press('Enter')
    await wait(3000)
    if (i === 3) await check('4-chat-late')
  }

  await wait(2800)
  await check('5-caught')
  await tapText(page, '어디서 알아챌')
  await wait(1400)
  await check('6-find')
  await page.evaluate(() => {
    document.querySelectorAll('span.cursor-pointer').forEach((el) => el.click())

  })
  await wait(1200)
  await check('7-find-done')
  await tapText(page, '결과 보기')
  await wait(2400)
  await check('8-action')
  await browser.close()
  return { label, rows }
}

/** 동시에 4대씩 */
const results = []
for (let i = 0; i < DEVICES.length; i += 4) {
  results.push(...(await Promise.all(DEVICES.slice(i, i + 4).map(run))))
}
let bad = 0
for (const { label, rows } of results) {
  const issues = rows.filter((r) => r.problems.length)
  bad += issues.length
  const note = rows.some((r) => r.v) ? `  (스크롤 있음: ${rows.filter((r) => r.v).map((r) => r.screen).join(', ')})` : ''
  console.log(`${issues.length ? '✗' : '✓'} ${label}${note}`)
  for (const r of issues) console.log(`    ${r.screen}: ${r.problems.join(' / ')}`)
}
console.log(bad ? `\n문제 ${bad}건` : '\n전부 통과')
process.exit(bad ? 1 : 0)
