/**
 * 태블릿 화면 키보드 점검 (개발용) — 2026-09-28 현장 피드백("키보드가 입력칸을 가린다").
 *
 *   node tools/keyboard_check.mjs http://localhost:5175/
 *
 * PC 에는 화면 키보드가 없어서, 키보드가 올라온 상태를 세 가지 방식으로 흉내 냅니다(기기마다 알려 주는 방식이 다름):
 *   vv    '보이는 높이(visualViewport)'만 줄어듦 — 아이패드 사파리, 전체화면이 아닌 안드로이드 크롬
 *   vk    VirtualKeyboard API 가 키보드 높이를 알려 줌 — 안드로이드 크롬
 *   none  아무 신호도 없음 — **전체화면 안드로이드**(키보드가 떠도 화면 크기가 안 바뀜). 입력칸을 누른 것만으로 알아채야 함
 * 입력칸이 있는 화면마다(이름 입력 · 3번 본인 확인 · 4번 본인확인/결제) 칸을 하나씩 눌러 보고 확인합니다.
 *   1) 누른 입력칸이 키보드 위 보이는 자리에 있는가
 *   2) 손으로 밀 수 있는가(스크롤 여유가 생겼는가), 끝까지 밀면 아래 버튼이 키보드 위로 올라오는가
 *   3) 키보드가 내려가면 원래 배치로 돌아오는가(여백 0, 스크롤 0)
 */
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv.slice(2).find((a) => a.startsWith('http')) ?? 'http://localhost:5175/'
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'shots', 'keyboard')
mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

/** [이름, 폭, 높이, 키보드 높이] — 가로 태블릿 키보드는 화면의 45% 안팎 */
const DEVICES = [
  ['갤탭S9FE-1280x800', 1280, 800, 350],
  ['갤탭S9FE-주소창-1280x712', 1280, 712, 330],
  ['아이패드-1180x820', 1180, 820, 400],
  ['아이패드9-1080x810', 1080, 810, 400],
]
const VALUES = { name: '홍길동', phone: '01098765432', rrn: '900101', card: '5327123412340412', exp: '0929', pw: '12' }
const fails = []
let checks = 0

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] })
for (const mode of ['vv', 'vk', 'none'])
for (const [dev0, w, h, kb] of DEVICES) {
  const dev = `${dev0}[${mode}]`
  const page = await browser.newPage()
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  await page.evaluateOnNewDocument((mode) => {
    // 가짜 visualViewport — vv 방식일 때만 높이가 줄어듭니다
    const t = new EventTarget()
    const fake = { height: window.innerHeight, width: window.innerWidth, offsetTop: 0, offsetLeft: 0, scale: 1, addEventListener: t.addEventListener.bind(t), removeEventListener: t.removeEventListener.bind(t), dispatchEvent: t.dispatchEvent.bind(t) }
    Object.defineProperty(window, 'visualViewport', { value: fake, configurable: true })
    // 가짜 VirtualKeyboard — vk 방식일 때만 둡니다
    const k = new EventTarget()
    const vk = { overlaysContent: false, boundingRect: { height: 0 }, addEventListener: k.addEventListener.bind(k), removeEventListener: k.removeEventListener.bind(k), dispatchEvent: k.dispatchEvent.bind(k) }
    Object.defineProperty(navigator, 'virtualKeyboard', { value: mode === 'vk' ? vk : undefined, configurable: true })
    window.__kb = (px) => {
      if (mode === 'vv') { fake.height = window.innerHeight - px; fake.dispatchEvent(new Event('resize')) }
      if (mode === 'vk') { vk.boundingRect = { height: px }; vk.dispatchEvent(new Event('geometrychange')) }
    }
  }, mode)
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 100)))
  const seen = h - kb
  const tap = async (role, ms = 1200) => { await page.waitForSelector(`[data-role="${role}"]`, { visible: true, timeout: 20000 }); await wait(300); await page.evaluate((r) => document.querySelector(`[data-role="${r}"]`).click(), role); await wait(ms) }

  /** 입력칸 하나: 키보드 올림 → 누름 → 보이는가 → 글자 침 */
  const field = async (screen, sel, text) => {
    checks += 1
    await page.evaluate(() => window.__kb(0)); await wait(200)
    await page.evaluate((s) => document.querySelector(s).focus(), sel)
    await page.evaluate((px) => window.__kb(px), kb); await wait(1100)
    const r = await page.evaluate((s) => { const e = document.querySelector(s); const q = e.getBoundingClientRect(); const box = e.closest('[data-scroll], [data-scroll-screen]'); return { top: Math.round(q.top), bottom: Math.round(q.bottom), room: box ? box.scrollHeight - box.clientHeight : -1, pad: box ? getComputedStyle(box).paddingBottom : '' } }, sel)
    const ok = r.top >= 0 && r.bottom <= seen
    if (!ok) fails.push(`${dev} ${screen} ${sel}: 입력칸이 키보드에 가림 (칸 ${r.top}~${r.bottom}px, 보이는 높이 ${seen}px)`)
    if (r.room < 20) fails.push(`${dev} ${screen} ${sel}: 밀 수 있는 여유가 없음 (${r.room}px)`)
    await page.keyboard.type(text, { delay: 8 })
    return r
  }
  /** 끝까지 밀었을 때 버튼이 키보드 위로 올라오는가 */
  const button = async (screen, role) => {
    checks += 1
    const r = await page.evaluate((role) => { const e = document.querySelector(`[data-role="${role}"]`); const box = e.closest('[data-scroll], [data-scroll-screen]'); box.scrollTop = box.scrollHeight; const q = e.getBoundingClientRect(); const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName); return { top: Math.round(q.top), bottom: Math.round(q.bottom), typing } }, role)
    // 마지막 칸을 다 채우면 키보드가 내려갑니다 — 그때는 화면 전체가 보이는 높이입니다
    const seenNow = r.typing ? seen : h
    if (!(r.top >= 0 && r.bottom <= seenNow)) fails.push(`${dev} ${screen} [${role}]: 끝까지 밀어도 버튼이 키보드에 가림 (${r.top}~${r.bottom}px, 보이는 높이 ${seen}px)`)
    await page.screenshot({ path: join(OUT, `${dev}-${screen}.png`), captureBeyondViewport: false })
  }
  /** 키보드 내림 → 원래대로 */
  const close = async (screen, sel) => {
    checks += 1
    await page.evaluate(() => { document.activeElement?.blur(); window.__kb(0) }); await wait(500)
    const r = await page.evaluate((s) => { const box = document.querySelector(s)?.closest('[data-scroll], [data-scroll-screen]'); return box ? { pad: getComputedStyle(box).paddingBottom, top: box.scrollTop, over: box.scrollHeight - box.clientHeight } : null }, sel)
    if (!r || r.pad !== '0px' || r.top > 2) fails.push(`${dev} ${screen}: 키보드를 내려도 원래대로 안 돌아옴 ${JSON.stringify(r)}`)
  }

  try {
    // 이름 입력
    await page.goto(`${URL}?topic=agency&t=${Date.now()}`, { waitUntil: 'domcontentloaded' }); await wait(1500)
    await field('이름입력', '[data-role=name-input]', '홍길동')
    await close('이름입력', '[data-role=name-input]')

    // 4번 본인확인 · 결제
    await page.goto(`${URL}?topic=agency&name=%ED%99%8D%EA%B8%B8%EB%8F%99&t=${Date.now()}`, { waitUntil: 'domcontentloaded' })
    await tap('brief-start'); await tap('vip-open', 1000)
    for (const id of ['name', 'phone', 'rrn']) await field('4번-본인확인', `[data-role=vip-field-${id}]`, VALUES[id])
    await button('4번-본인확인', 'vip-verify-next')
    await close('4번-본인확인', '[data-role=vip-field-name]')
    await tap('vip-verify-next'); await tap('vip-seat-next')
    for (const id of ['card', 'exp', 'pw']) await field('4번-결제', `[data-role=vip-field-${id}]`, VALUES[id])
    await button('4번-결제', 'vip-pay')
    await close('4번-결제', '[data-role=vip-field-card]')

    // 3번 본인 확인
    await page.goto(`${URL}?topic=family&name=%ED%99%8D%EA%B8%B8%EB%8F%99&t=${Date.now()}`, { waitUntil: 'domcontentloaded' })
    await tap('brief-start'); await tap('open-channel', 2500); await tap('smish-open', 2500)
    await field('3번-본인확인', '[data-role=smish-name]', '홍길동')
    await field('3번-본인확인', '[data-role=smish-phone]', '01098765432')
    await page.evaluate(() => window.__kb(0)); await tap('smish-send', 1200); await tap('smish-popup-ok', 1800)
    await field('3번-본인확인', '[data-role=smish-code]', '482913')
    await button('3번-본인확인', 'smish-verify-code')
    await close('3번-본인확인', '[data-role=smish-name]')
  } catch (e) {
    fails.push(`${dev}: 점검 도중 멈춤 — ${String(e.message).slice(0, 120)}`)
  }
  if (errors.length) fails.push(`${dev}: 페이지 오류 — ${errors[0]}`)
  console.log(`${dev}: 키보드 ${kb}px (보이는 높이 ${seen}px) 확인`)
  await page.close()
}
await browser.close()
console.log(`\n총 ${checks}가지 확인 · 실패 ${fails.length}건`)
for (const f of fails) console.log('  ✗ ' + f)
process.exit(fails.length ? 1 : 0)
