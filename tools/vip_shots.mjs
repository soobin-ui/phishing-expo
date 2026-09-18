/**
 * 4번 사건(가짜 통신사 VIP 초청 사이트) 자동 주행 + 캡처 + 넘침 검사 (개발용).
 *
 *   node tools/vip_shots.mjs http://localhost:5186/
 *
 * 경로 A(먼저 확인): 브리핑 → 팝업 → [진짜인지 먼저 확인] → 고객센터 상담 → 위험 차단 → 검거 카드(앞·뒤)
 * 경로 B(당하고 배움): 팝업 → 본인확인 → 좌석 → 보증금 결제 → 빵빠레 → 알림 폭탄 → 피해 화면 → [다시 해보기]
 *                      → 팝업 → [먼저 확인] → 검거 카드(별점 낮음)
 * 기기 3종으로 찍습니다 → tools/shots/vip/
 */
import { mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv.find((a) => a.startsWith('http')) ?? 'http://localhost:8899/'
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'shots', 'vip')
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const DEVICES = [
  ['폰', 390, 844, true],
  ['탭세로', 820, 1180, true],
  ['노트북', 1366, 768, false],
]

async function open([label, w, h, mobile]) {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] })
  const page = await browser.newPage()
  await page.setViewport({ width: w, height: h, isMobile: mobile, hasTouch: mobile })
  await page.goto(`${URL}?topic=agency&name=${encodeURIComponent('전수빈')}&t=${Date.now()}`, { waitUntil: 'networkidle0' })
  await page.evaluate(() => document.fonts.ready)
  const problems = []
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  const click = async (sel) => {
    await page.waitForSelector(sel, { timeout: 20000 })
    await page.evaluate((s) => document.querySelector(s).click(), sel)
  }
  const shot = async (name) => {
    const bad = await page.evaluate(() => {
      const W = innerWidth
      const H = innerHeight
      const out = []
      if (document.documentElement.scrollWidth > W) out.push('가로 넘침')
      const inScroller = (el) => {
        for (let n = el.parentElement; n; n = n.parentElement) {
          const o = getComputedStyle(n).overflowY
          if (o === 'auto' || o === 'scroll') return true
        }
        return false
      }
      document.querySelectorAll('button:not([aria-hidden])').forEach((el) => {
        const r = el.getBoundingClientRect()
        if (!r.width || inScroller(el)) return
        if (r.right > W + 1 || r.bottom > H + 1 || r.left < -1) out.push('화면 밖:' + (el.innerText || '').slice(0, 10))
      })
      return out
    })
    if (bad.length) problems.push(`${name}: ${bad.join(', ')}`)
    await page.screenshot({ path: join(OUT, `${label}-${name}.png`) })
  }
  const fillAll = async () => {
    await page.evaluate(() => document.querySelectorAll('[data-role^="vip-field-"]').forEach((b) => b.click()))
    await wait(1500)
  }
  const spot = async (target) => {
    await click(`[data-spot="${target}"]`)
    await wait(700)
  }
  return { browser, page, click, shot, fillAll, spot, problems, errors, label }
}

/** 경로 A — 결제 전에 먼저 확인 */
async function runA(device) {
  const s = await open(device)
  await wait(1200)
  await s.shot('A0-브리핑')
  await s.click('[data-role="rules-start"]')
  await wait(1600)
  await s.shot('A1-팝업')
  await s.click('[data-role="vip-safe"]')
  await wait(2500)
  await s.shot('A2-고객센터')
  await s.click('[data-role="vip-safe-next"]')
  await wait(3200)
  await s.shot('A3-검거카드')
  await s.click('[data-role="flip-card"]')
  await wait(1800)
  await s.shot('A4-카드뒷면')
  const ok = await s.page.evaluate(() => document.body.innerText.includes('검거 완료'))
  await s.browser.close()
  return { path: 'A', label: s.label, problems: s.problems, errors: s.errors, ok }
}

/** 경로 B — 끝까지 결제해서 당한 뒤, 다시 해보기 → 먼저 확인 */
async function runB(device) {
  const s = await open(device)
  await s.click('[data-role="rules-start"]')
  await wait(1500)
  await s.click('[data-role="vip-open"]')
  await wait(800)
  await s.fillAll()
  await s.shot('B1-본인확인')
  await s.click('[data-role="vip-verify-next"]')
  await wait(600)
  await s.shot('B2-좌석')
  await s.click('[data-role="vip-seat-next"]')
  await wait(600)
  await s.fillAll()
  await s.shot('B3-결제')
  await s.click('[data-role="vip-pay"]')
  await wait(2600)
  await s.shot('B4-초청완료')
  await wait(3200)
  await s.shot('B5-알림폭탄')
  await s.page.waitForSelector('[data-role="vip-retry"]', { timeout: 20000 })
  await s.shot('B5b-피해화면')
  await s.click('[data-role="vip-retry"]')
  await wait(1400)
  await s.shot('B6-다시팝업')
  await s.click('[data-role="vip-safe"]')
  await s.click('[data-role="vip-safe-next"]')
  await wait(3200)
  await s.shot('B7-검거카드')
  const ok = await s.page.evaluate(() => document.body.innerText.includes('검거 완료'))
  await s.browser.close()
  return { path: 'B', label: s.label, problems: s.problems, errors: s.errors, ok }
}

const results = []
for (const d of DEVICES) results.push(...(await Promise.all([runA(d), runB(d)])))
for (const r of results) {
  const bad = r.problems.length || r.errors.length || !r.ok
  console.log(`${bad ? '✗' : '✓'} ${r.path} ${r.label}${r.ok ? '' : ' · 마지막 카드 제목 안 보임'}${r.problems.length ? '  ' + r.problems.join(' / ') : ''}${r.errors.length ? '  오류:' + r.errors[0] : ''}`)
}
