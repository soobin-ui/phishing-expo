/**
 * 첫 화면(역할 소개) → 사건 고르기 → 연구실 바로 시작 확인 (개발용).
 *
 *   node tools/intro_shots.mjs http://localhost:8899/
 *
 * 기기 3종으로 첫 화면·주제 고르기·연구실 받은편지함을 찍고,
 * 버튼이 화면 밖으로 밀리거나 스크롤이 생기는지 검사합니다 → tools/shots/intro/
 */
import { mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv.find((a) => a.startsWith('http')) ?? 'http://localhost:8899/'
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'shots', 'intro')
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const DEVICES = [
  ['폰', 390, 844, true],
  ['작은폰', 360, 640, true],
  ['탭세로', 820, 1180, true],
  ['탭가로', 1180, 820, true],
  ['노트북', 1366, 768, false],
]

for (const [label, w, h, mobile] of DEVICES) {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewport({ width: w, height: h, isMobile: mobile, hasTouch: mobile })
  await page.goto(`${URL}?t=${Date.now()}`, { waitUntil: 'networkidle0' })
  await page.evaluate(() => document.fonts.ready)
  await wait(1400)
  const fit = await page.evaluate(() => {
    const sc = document.querySelector('[data-scroll-screen]')
    const btn = [...document.querySelectorAll('button')].find((b) => b.innerText.includes('수사 시작하기'))
    const r = btn?.getBoundingClientRect()
    return {
      scroll: sc ? sc.scrollHeight - sc.clientHeight : -1,
      btnBottom: r ? Math.round(r.bottom) : null,
      wide: document.documentElement.scrollWidth > innerWidth,
    }
  })
  await page.screenshot({ path: join(OUT, `${label}-1-intro.png`) })
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.includes('수사 시작하기'))?.click())
  await wait(1000)
  const menuFit = await page.evaluate(() => {
    const sc = document.querySelector('[data-scroll-screen]')
    const rows = [...document.querySelectorAll('button')].filter((b) => b.innerText.includes('CASE'))
    return { scroll: sc ? sc.scrollHeight - sc.clientHeight : -1, rows: rows.length, last: Math.round(rows.at(-1)?.getBoundingClientRect().bottom ?? 0) }
  })
  await page.screenshot({ path: join(OUT, `${label}-2-menu.png`) })
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.includes('연구실'))?.click())
  await wait(1000)
  const inbox = await page.evaluate(() => !!document.querySelector('[data-role="open-phish"]'))
  if (inbox) {
    await page.click('[data-role="open-phish"]')
    await wait(700)
  }
  await page.screenshot({ path: join(OUT, `${label}-3-rnd.png`) })
  const ok = menuFit.scroll <= 1 && menuFit.rows === 5 && fit.scroll <= 1 && !fit.wide && fit.btnBottom !== null && fit.btnBottom <= h && inbox && !errors.length
  console.log(`${ok ? '✓' : '✗'} ${label} ${w}×${h} · 스크롤 ${fit.scroll}px · 버튼 아래끝 ${fit.btnBottom}/${h} · 사건 목록 ${menuFit.rows}개 스크롤 ${menuFit.scroll}px 마지막 ${menuFit.last}/${h} · 연구실 바로 시작 ${inbox ? '예' : '아니오'}${errors.length ? ' · 오류 ' + errors.join(' / ') : ''}`)
  await browser.close()
}
