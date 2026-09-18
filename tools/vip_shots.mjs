/**
 * 4번 사건(가짜 통신사 VIP 초청 사이트) 자동 주행 + 캡처 + 넘침 검사 (개발용).
 *
 *   node tools/vip_shots.mjs http://localhost:5186/
 *
 * 경로 A(수사 성공): 브리핑 → 팝업 → 본인확인(주민번호 찾기) → 좌석(압박 찾기) → 결제(보증금·주소 찾기)
 *                    → '만약 결제했다면?' → 빵빠레 → 알림 폭탄 → 진실 → 검거 카드(앞·뒤)
 * 경로 B(그냥 결제):  아무것도 안 찾고 끝까지 결제 → 알림 폭탄 → 진실 → 검거 카드
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
    await page.waitForSelector(sel, { timeout: 10000 })
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

/** 경로 A — 네 곳을 다 찾고 '만약 결제했다면?' */
async function runA(device) {
  const s = await open(device)
  await wait(1200)
  await s.shot('A0-브리핑')
  await s.click('[data-role="rules-start"]')
  await wait(1600)
  await s.shot('A1-팝업')
  await s.click('[data-role="vip-open"]')
  await wait(900)
  await s.fillAll()
  await s.shot('A2-본인확인')
  await s.spot('overask')
  await s.shot('A3-발견말풍선')
  await s.click('[data-role="vip-found-ok"]')
  await wait(400)
  await s.click('[data-role="vip-verify-next"]')
  await wait(900)
  await s.shot('A4-좌석')
  await s.spot('pressure')
  await s.click('[data-role="vip-found-ok"]')
  await wait(400)
  await s.click('[data-role="vip-seat-next"]')
  await wait(700)
  await s.fillAll()
  await s.shot('A5-결제')
  await s.spot('deposit')
  await s.click('[data-role="vip-found-ok"]')
  await wait(400)
  await s.spot('fake_domain')
  await s.click('[data-role="vip-found-ok"]')
  await wait(900)
  await s.shot('A6-전부찾음')
  await s.click('[data-role="vip-sim"]')
  await wait(1600)
  await s.shot('A7-초청완료')
  await wait(2600)
  await s.shot('A8-알림폭탄')
  await s.click('[data-role="vip-reveal-next"]')
  await wait(3200)
  await s.shot('A9-검거카드')
  await s.click('[data-role="flip-card"]')
  await wait(1800)
  await s.shot('A10-카드뒷면')
  const found = await s.page.evaluate(() => document.body.innerText.includes('검거 완료'))
  await s.browser.close()
  return { path: 'A', label: s.label, problems: s.problems, errors: s.errors, ok: found }
}

/** 경로 B — 아무것도 안 찾고 그대로 결제 */
async function runB(device) {
  const s = await open(device)
  await s.click('[data-role="rules-start"]')
  await wait(1500)
  await s.click('[data-role="vip-open"]')
  await wait(800)
  await s.fillAll()
  await s.click('[data-role="vip-verify-next"]')
  await wait(600)
  await s.click('[data-role="vip-seat-next"]')
  await wait(600)
  await s.fillAll()
  await s.click('[data-role="vip-pay"]')
  await wait(2600)
  await s.shot('B1-초청완료')
  await wait(3200)
  await s.shot('B2-알림폭탄')
  await s.click('[data-role="vip-reveal-next"]')
  await wait(3200)
  await s.shot('B3-수사완료카드')
  const ok = await s.page.evaluate(() => document.body.innerText.includes('수사 완료'))
  await s.browser.close()
  return { path: 'B', label: s.label, problems: s.problems, errors: s.errors, ok }
}

const results = []
for (const d of DEVICES) results.push(...(await Promise.all([runA(d), runB(d)])))
for (const r of results) {
  const bad = r.problems.length || r.errors.length || !r.ok
  console.log(`${bad ? '✗' : '✓'} ${r.path} ${r.label}${r.ok ? '' : ' · 마지막 카드 제목 안 보임'}${r.problems.length ? '  ' + r.problems.join(' / ') : ''}${r.errors.length ? '  오류:' + r.errors[0] : ''}`)
}
