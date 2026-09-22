/**
 * 주제별 받는 화면(메일·문자·전화) 캡처 + 넘침 검사 (개발용).
 *   rnd=메일(수사) · family=문자(청첩장 스미싱, 브리핑 → 잠금화면에 친구·광고 문자 알림) · agency=전화
 *
 *   node tools/channel_shots.mjs http://localhost:8899/
 *
 * 주제마다 ?topic= 으로 바로 열어 답장 5개를 직접 쳐 넣고,
 * 대화 중 · 결과 · 찾기(전부 찾음) 를 기기 3종으로 찍습니다 → tools/shots/channels/
 * 전화는 한 번 더 열어 [끊기] 경로도 확인합니다.
 */
import { mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv.find((a) => a.startsWith('http')) ?? 'http://localhost:8899/'
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'shots', 'channels')
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
// 취업·채용(job)은 포렌식 수사라 tools/forensic_shots.mjs 에서 따로 검사합니다
const TOPICS = ['rnd', 'family', 'agency']
const DEVICES = [
  ['폰', 390, 844, true],
  ['탭세로', 820, 1180, true],
  ['노트북', 1366, 768, false],
]
const REPLIES = ['누구세요?', '네 알겠습니다', '지금 해볼게요', '210-889-334512', '알겠습니다']

async function run(topic, [label, w, h, mobile]) {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] })
  const page = await browser.newPage()
  await page.setViewport({ width: w, height: h, isMobile: mobile, hasTouch: mobile })
  await page.goto(`${URL}?topic=${topic}&t=${Date.now()}`, { waitUntil: 'networkidle0' })
  await page.evaluate(() => document.fonts.ready)
  const problems = []
  // 도착 화면 — 먼저 한 장 찍고(폰만), 눌러서 엽니다(전화는 [받기])
  // 메일은 도착 화면 대신 받은편지함으로 바로 시작합니다
  if (topic !== 'rnd') {
    // 사건 브리핑이 있는 주제(스미싱)는 [수사 시작하기]를 눌러야 피싱 문자가 도착합니다
    await wait(900)
    await page.click('[data-role="brief-start"]').catch(() => {})
    await page.waitForSelector('[data-role="open-channel"]', { timeout: 10000 })
    await wait(1200)
    if (label === '폰') await page.screenshot({ path: join(OUT, `${topic}-폰-0-arrive.png`) })
    await page.click('[data-role="open-channel"]')
    await wait(1500)
  }
  const shot = async (name) => {
    const m = await page.evaluate(() => {
      const W = innerWidth
      const H = innerHeight
      const bad = []
      if (document.documentElement.scrollWidth > W) bad.push('가로 넘침')
      // 스크롤되는 목록(받은편지함·대화) 안의 요소는 화면 밖에 있어도 정상입니다
      const inScroller = (el) => {
        for (let n = el.parentElement; n; n = n.parentElement) {
          const o = getComputedStyle(n).overflowY
          if (o === 'auto' || o === 'scroll') return true
        }
        return false
      }
      document.querySelectorAll('button:not([aria-hidden]), input').forEach((el) => {
        const r = el.getBoundingClientRect()
        if (!r.width || inScroller(el)) return
        if (r.right > W + 1 || r.bottom > H + 1 || r.left < -1)
          bad.push('화면 밖:' + (el.innerText || el.placeholder || el.getAttribute('aria-label') || '').split(String.fromCharCode(10))[0].slice(0, 10))
      })
      return bad
    })
    if (m.length) problems.push(`${name}: ${m.join(', ')}`)
    await page.screenshot({ path: join(OUT, `${topic}-${label}-${name}.png`) })
  }

  if (topic === 'rnd') {
    // 메일 — 수사관 모드: 규칙 상자(뒤에 흐린 받은편지함) → [수사 시작하기] → 받은편지함
    await page.waitForSelector('[data-role="rules-start"]', { timeout: 10000 })
    await wait(1300)
    await shot('0-rules')
    await page.click('[data-role="rules-start"]')
    await wait(800)
    await shot('1-inbox')
    await page.click('[data-role="open-phish"]')
    await wait(800)
    await shot('2-mail')
    // 보낸 사람 주소 → 본문 협박 → 링크 → 첨부 (각각 말풍선에서 올바른 조사 방법 고르기)
    await page.evaluate(() => [...document.querySelectorAll('span')].find((x) => x.textContent?.includes('nrf.ro.kr'))?.click())
    await wait(500)
    await shot('3-probe')
    await page.click('[data-role="probe-ok"]')
    await wait(600)
    await page.evaluate(() => [...document.querySelectorAll('span')].find((x) => x.textContent?.includes('연구비 환수 및 향후'))?.click())
    await wait(500)
    await page.click('[data-role="probe-ok"]')
    await wait(600)
    await page.click('[data-role="mail-link"]')
    await wait(500)
    await page.click('[data-role="probe-ok"]')
    await wait(600)
    await page.click('[data-role="attachment"]')
    await wait(500)
    await page.click('[data-role="probe-ok"]')
    await wait(1400)
    await shot('4-hit')
    await wait(2600)
    await shot('5-card')
    await page.click('[data-role="flip-card"]')
    await wait(1400)
    await shot('6-card-back')
    await page.click('[data-role="flip-card"]')
    await wait(1200)
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.includes('이렇게 예방'))?.click())
    await wait(1500)
    await shot('7-action')
    await browser.close()
    return { topic, label, problems, flags: 4 }
  } else if (await page.$('[data-role="smish-reply"]')) {
    // 선택형(스미싱) — 답장 → 사진 확인 → 가짜 본인확인 페이지를 끝까지
    await shot('1-chat')
    await page.click('[data-role="smish-reply"]')
    await wait(2600)
    await page.click('[data-role="smish-open"]')
    await wait(900)
    await page.type('[data-role="smish-name"]', '홍길동')
    await page.type('[data-role="smish-phone"]', '01000000000')
    await page.click('[data-role="smish-send"]')
    await wait(500)
    await page.click('[data-role="smish-popup-ok"]')
    await wait(1600)
    await shot('2-page')
    await page.type('[data-role="smish-code"]', '482913')
    await page.click('[data-role="smish-verify-code"]')
    await wait(500)
    // 인증하기 직후 뜨는 '본인 확인 완료' 팝업 안의 [청첩장 보기]로 진행(2026-09-22)
    await page.click('[data-role="smish-verified-view"]')
    await wait(6500)
    await shot('3-damage') // 피해 카드 → 다시 시도 → 먼저 확인 → 검거 카드
    await page.click('[data-role="smish-retry"]')
    await wait(800)
    await page.click('[data-role="smish-verify"]')
    await wait(6500)
    await page.click('[data-role="smish-verify-next"]')
    await wait(3400)
    await shot('5-card')
    await page.click('[data-role="flip-card"]')
    await wait(1600)
    await shot('6-card-back')
    await browser.close()
    return { topic, label, problems, flags: 4 }
  } else {
    for (let i = 0; i < REPLIES.length; i += 1) {
      await page.waitForFunction(() => {
        const el = document.querySelector('input')
        return el && !el.disabled
      }, { timeout: 10000 })
      await page.type('input', REPLIES[i], { delay: 4 })
      await page.keyboard.press('Enter')
      await wait(2900)
      if (i === 2) await shot('1-chat')
    }
    await wait(2600)
  }
  await shot('3-caught')
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.includes('어디서'))?.click())
  await wait(1300)
  await page.evaluate(() => document.querySelectorAll('span.cursor-pointer').forEach((el) => el.click()))
  await wait(900)
  const flags = await page.evaluate(() => document.querySelectorAll('span.cursor-pointer').length)
  await shot('4-find')
  await browser.close()
  return { topic, label, problems, flags }
}

async function hangUp() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 820, height: 1180, isMobile: true, hasTouch: true })
  await page.goto(`${URL}?topic=agency&t=${Date.now()}`, { waitUntil: 'networkidle0' })
  await wait(1500)
  await page.click('[data-role="open-channel"]')  // 받기
  await wait(1800)
  await page.click('[data-role="hang-up"]')
  await wait(2200)
  const text = await page.evaluate(() => document.body.innerText)
  await page.screenshot({ path: join(OUT, 'agency-끊기.png') })
  // 끊은 뒤 남은 타이머가 화면을 되돌리지 않는지 — 5초 더 기다려 봅니다
  await wait(5000)
  const still = await page.evaluate(() => document.body.innerText.includes('넘어가지 않았습니다'))
  await browser.close()
  return { ok: text.includes('넘어가지 않았습니다'), still }
}

const jobs = []
for (const t of TOPICS) for (const d of DEVICES) jobs.push([t, d])
const results = []
for (let i = 0; i < jobs.length; i += 2) {
  results.push(...(await Promise.all(jobs.slice(i, i + 2).map(([t, d]) => run(t, d)))))
}
for (const r of results) {
  console.log(`${r.problems.length ? '✗' : '✓'} ${r.topic} ${r.label} · 누를 수 있는 곳 ${r.flags}${r.problems.length ? '  ' + r.problems.join(' / ') : ''}`)
}
async function decline() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
  await page.goto(`${URL}?topic=agency&t=${Date.now()}`, { waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-role="decline"]', { timeout: 10000 })
  await page.screenshot({ path: join(OUT, 'agency-폰-0-ringing.png') })
  await page.click('[data-role="decline"]')
  await new Promise((r) => setTimeout(r, 2000))
  const ok = await page.evaluate(() => document.body.innerText.includes('넘어가지 않았습니다'))
  await browser.close()
  return ok
}

const d = await decline()
console.log(`${d ? '✓' : '✗'} 전화 도착 [거절] → 넘어가지 않음 ${d ? '표시' : '안 뜸'}`)
const h = await hangUp()
console.log(`${h.ok && h.still ? '✓' : '✗'} 전화 [끊기] → 넘어가지 않음 ${h.ok ? '표시' : '안 뜸'} · 5초 뒤에도 유지 ${h.still ? '예' : '아니오'}`)
