/**
 * 터치로 밀기 점검 (개발용) — 2026-09-28 "본인확인 화면이 손으로 안 밀린다"(실물 태블릿).
 *
 *   node tools/touch_scroll_check.mjs http://localhost:5175/
 *
 * scrollTop 을 코드로 바꾸는 것이 아니라 **실제 터치 끌기**(손가락을 대고 위로 밀기)를 보내서 확인합니다.
 * 키보드는 띄우지 않습니다 — 키보드가 떴는지와 상관없이 밀려야 합니다.
 *   4번 본인확인 · 4번 결제 · 3번 본인 확인 화면에서
 *   1) 손가락으로 밀면 화면이 움직이는가          2) 끝까지 밀면 맨 아래 버튼이 화면 위쪽 절반에 오는가
 *   3) 다시 아래로 밀면 처음 자리로 돌아오는가    4) 입력칸 위에 손가락을 대고 밀어도 움직이는가
 */
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv.slice(2).find((a) => a.startsWith('http')) ?? 'http://localhost:5175/'
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'shots', 'touch')
mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const DEVICES = [['갤탭S9FE-1280x800', 1280, 800], ['갤탭S9FE-주소창-1280x712', 1280, 712], ['아이패드-1180x820', 1180, 820], ['아이패드9-1080x810', 1080, 810]]
const fails = []
let checks = 0

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] })
for (const [dev, w, h] of DEVICES) {
  const page = await browser.newPage()
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 100)))
  const tap = async (role, ms = 1200) => { await page.waitForSelector(`[data-role="${role}"]`, { visible: true, timeout: 20000 }); await wait(300); await page.evaluate((r) => document.querySelector(`[data-role="${r}"]`).click(), role); await wait(ms) }
  const top = (sel) => page.evaluate((s) => Math.round(document.querySelector(s).scrollTop), sel)
  /** 손가락을 (x, y0)에 대고 (x, y1)까지 천천히 끕니다 */
  const drag = async (x, y0, y1) => {
    await page.touchscreen.touchStart(x, y0)
    const n = 12
    for (let i = 1; i <= n; i += 1) { await page.touchscreen.touchMove(x, y0 + ((y1 - y0) * i) / n); await wait(16) }
    await page.touchscreen.touchEnd()
    await wait(700)
  }
  const screen = async (label, box, button, field) => {
    const x = Math.round(w * 0.82) // 입력칸 밖 빈 자리
    checks += 4
    const a = await top(box)
    await drag(x, h * 0.8, h * 0.3)
    const b = await top(box)
    if (b - a < 80) fails.push(`${dev} ${label}: 손으로 밀어도 안 움직임 (${a} → ${b})`)
    for (let i = 0; i < 3; i += 1) await drag(x, h * 0.8, h * 0.25)
    const pos = await page.evaluate((r) => { const q = document.querySelector(`[data-role="${r}"]`).getBoundingClientRect(); return { top: Math.round(q.top), bottom: Math.round(q.bottom) } }, button)
    if (!(pos.top >= 0 && pos.bottom <= h * 0.55)) fails.push(`${dev} ${label}: 끝까지 밀어도 [${button}] 버튼이 화면 위쪽 절반에 안 옴 (${pos.top}~${pos.bottom}px / 화면 ${h}px)`)
    await page.screenshot({ path: join(OUT, `${dev}-${label}.png`), captureBeyondViewport: false })
    for (let i = 0; i < 4; i += 1) await drag(x, h * 0.3, h * 0.85)
    const c = await top(box)
    if (c > 4) fails.push(`${dev} ${label}: 아래로 밀어도 처음 자리로 안 돌아옴 (${c})`)
    // 입력칸 위에 손가락을 대고 밀기
    const f = await page.evaluate((s) => { const q = document.querySelector(s).getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 } }, field)
    await drag(f.x, f.y, Math.max(40, f.y - 260))
    const d = await top(box)
    if (d - c < 80) fails.push(`${dev} ${label}: 입력칸 위에서 밀면 안 움직임 (${c} → ${d})`)
    for (let i = 0; i < 4; i += 1) await drag(x, h * 0.3, h * 0.85)
  }
  try {
    await page.goto(`${URL}?topic=agency&name=%ED%99%8D%EA%B8%B8%EB%8F%99&t=${Date.now()}`, { waitUntil: 'domcontentloaded' })
    await tap('brief-start'); await tap('vip-open', 1000)
    await screen('4번-본인확인', '[data-scroll=site-form]', 'vip-verify-next', '[data-role=vip-field-phone]')
    // 칸을 다 채우면 다음 칸으로 넘어가며 화면이 부드럽게 움직입니다 — 움직이는 중에 좌표로 누르면 빗나가므로 커서를 직접 옮깁니다
    for (const [id, v] of [['name', '홍길동'], ['phone', '01098765432'], ['rrn', '900101']]) { await page.evaluate((s) => document.querySelector(s).focus(), `[data-role=vip-field-${id}]`); await wait(150); await page.keyboard.type(v, { delay: 8 }); await wait(500) }
    await tap('vip-verify-next'); await tap('vip-seat-next')
    await screen('4번-결제', '[data-scroll=site-form]', 'vip-pay', '[data-role=vip-field-card]')
    await page.goto(`${URL}?topic=family&name=%ED%99%8D%EA%B8%B8%EB%8F%99&t=${Date.now()}`, { waitUntil: 'domcontentloaded' })
    await tap('brief-start'); await tap('open-channel', 2500); await tap('smish-open', 2500)
    await screen('3번-본인확인', '[data-scroll=smish-page]', 'smish-view', '[data-role=smish-name]')
  } catch (e) {
    fails.push(`${dev}: 점검 도중 멈춤 — ${String(e.message).slice(0, 120)}`)
  }
  if (errors.length) fails.push(`${dev}: 페이지 오류 — ${errors[0]}`)
  console.log(`${dev}: 확인`)
  await page.close()
}
await browser.close()
console.log(`\n총 ${checks}가지 확인 · 실패 ${fails.length}건`)
for (const f of fails) console.log('  ✗ ' + f)
process.exit(fails.length ? 1 : 0)
