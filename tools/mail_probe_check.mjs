/**
 * [1번 이메일 사건] 말풍선 안전 점검 (개발용) — 2026-09-21 행사 전 장애 재발 방지.
 *
 *   node tools/mail_probe_check.mjs http://localhost:5176/
 *
 * 장애 내용: 링크 버튼·첨부파일이 화면 아래쪽에 걸쳐 있을 때 누르면
 *   말풍선 자리 보정이 무한 반복 → React 가 앱 전체를 내림 → 빈 화면.
 *   특정 스크롤 위치에서만 생겨서 눈으로 점검할 때 놓쳤습니다.
 *
 * 그래서 이 점검은 기기 크기마다, 누를 수 있는 곳(수상한 문구 4곳)을
 *   **화면 위에서 아래까지 촘촘히 옮겨 가며** 눌러 봅니다. 매번 확인하는 것:
 *   1) 페이지 오류가 없는가 (Maximum update depth 등)
 *   2) 앱이 살아 있는가 (#root 가 비지 않았는가, 오류 복구 화면이 뜨지 않았는가)
 *   3) 말풍선이 뜨고, 메일 판 안에 온전히 들어와 있는가 (선택지를 누를 수 있는가)
 *   4) 틀린 답을 골라 안내 문구로 바뀐 뒤에도 1)~3)이 유지되는가
 *   5) 링크 버튼을 0.7초 꾹 눌렀다 떼도 말풍선이 뜨는가
 *
 * 하나라도 실패하면 종료 코드 1. 메일 화면을 고치면 배포 전에 꼭 돌리세요.
 */
import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv.slice(2).find((a) => a.startsWith('http')) ?? 'http://localhost:5176/'
const STEP = Number(process.argv.slice(2).find((a) => /^--step=/.test(a))?.split('=')[1] ?? 28)
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const DEVICES = [
  ['폰-375x667', 375, 667, true],
  ['폰-390x844', 390, 844, true],
  ['탭세로-820x1180', 820, 1180, true],
  ['탭가로-1180x820', 1180, 820, true],
  ['탭가로-1280x800', 1280, 800, true],
  ['탭가로-1024x768', 1024, 768, true],
  ['노트북-1366x768', 1366, 768, false],
  ['노트북-1280x720', 1280, 720, false],
  ['모니터-1920x1080', 1920, 1080, false],
]

/* 기기마다 브라우저를 따로 띄웁니다 — 한 브라우저의 여러 탭으로 돌리면 뒤에 깔린 탭의 타이머가 멈춰 점검이 걸립니다 */
const launch = () =>
  puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    protocolTimeout: 30000,
    args: ['--hide-scrollbars', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
  })
const fails = []
let taps = 0

/** 메일을 연 상태까지 갑니다 */
async function openMail(page) {
  await page.goto(`${URL}?topic=rnd&name=${encodeURIComponent('홍길동')}&t=${Date.now()}`, { waitUntil: 'domcontentloaded' })
  for (const role of ['rules-start', 'open-phish']) {
    await page.waitForSelector(`[data-role=${role}]`, { visible: true, timeout: 8000 })
    await wait(250)
    await page.click(`[data-role=${role}]`)
  }
  await page.waitForSelector('[data-role=mail-link]', { visible: true, timeout: 8000 })
  await wait(350)
}

/** 누를 곳 목록 — 링크·첨부 + 본문 속 수상한 문구(cursor-pointer 조각) */
const TARGETS = ['[data-role=mail-link]', '[data-role=attachment]', 'span.cursor-pointer:nth-of-type(1)']

/** 대상의 아랫변을 메일 판 위에서 offset px 자리에 오도록 스크롤. 실제 놓인 자리를 돌려줍니다 */
const place = (page, sel, offset) =>
  page.evaluate(
    (sel, offset) => {
      const el = sel.startsWith('span') ? document.querySelector('span.cursor-pointer') : document.querySelector(sel)
      if (!el) return null
      const sc = el.closest('.overflow-y-auto')
      const pane = sc.closest('section') ?? sc.parentElement
      const host = [...document.querySelectorAll('*')].find((n) => n.contains(sc) && getComputedStyle(n).position !== 'static' && n.tagName === 'SECTION') ?? pane
      const top = host.getBoundingClientRect().top
      sc.scrollTop += el.getBoundingClientRect().bottom - top - offset
      const r = el.getBoundingClientRect()
      const s = sc.getBoundingClientRect()
      // 스크롤 상자 안에서 실제로 보이고 누를 수 있는 자리인가
      const cy = r.top + Math.min(r.height / 2, 12)
      const visible = cy > s.top + 2 && cy < s.bottom - 2
      return { rel: Math.round(r.bottom - top), paneH: Math.round(host.clientHeight), visible, x: r.left + Math.min(r.width / 2, 40), y: cy }
    },
    sel,
    offset,
  )

const health = (page) =>
  page.evaluate(() => {
    const root = document.getElementById('root')
    const p = document.querySelector('[data-role=probe]')
    const host = p?.offsetParent
    let inside = null
    if (p && host) {
      const top = p.offsetTop
      const bottom = top + p.offsetHeight
      inside = top >= 0 && bottom <= host.clientHeight + 1
    }
    const btn = p?.querySelector('[data-role=probe-ok],[data-role=probe-retry]')
    let btnOk = null
    if (btn) {
      const r = btn.getBoundingClientRect()
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      btnOk = !!hit && (btn === hit || btn.contains(hit))
    }
    return { alive: root.children.length > 0, recover: !!document.querySelector('[data-role=error-recover]'), probe: !!p, inside, btnOk }
  })

async function runDevice([name, w, h, mobile]) {
  const browser = await launch()
  try {
    await runDeviceIn(browser, [name, w, h, mobile])
  } catch (e) {
    fails.push(`${name}: 점검 도중 멈춤 — ${String(e.message).slice(0, 120)}`)
  } finally {
    await browser.close().catch(() => {})
  }
}

async function runDeviceIn(browser, [name, w, h, mobile]) {
  const page = await browser.newPage()
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)))
  let count = 0

  for (const sel of TARGETS) {
    await openMail(page)
    const first = await place(page, sel, 100)
    if (!first) { fails.push(`${name} ${sel}: 대상을 찾지 못함`); continue }
    for (let offset = 40; offset <= first.paneH; offset += STEP) {
      await openMail(page)
      const at = await place(page, sel, offset)
      await wait(120)
      if (!at?.visible) continue
      errors.length = 0
      await page.mouse.click(at.x, at.y)
      await wait(450)
      taps += 1; count += 1
      let s = await health(page)
      const tag = `${name} ${sel} @${at.rel}/${at.paneH}`
      if (errors.length) fails.push(`${tag}: 페이지 오류 — ${errors[0]}`)
      if (!s.alive || s.recover) { fails.push(`${tag}: 앱이 내려감(빈 화면/복구 화면)`); continue }
      if (!s.probe) { fails.push(`${tag}: 말풍선이 안 뜸`); continue }
      if (s.inside === false) fails.push(`${tag}: 말풍선이 메일 판 밖으로 나감`)
      if (s.btnOk === false) fails.push(`${tag}: 말풍선 선택지를 누를 수 없음`)
      // 틀린 답 → 안내 문구로 바뀐 뒤에도 멀쩡한가
      const no = await page.$('[data-role=probe-no]')
      if (no) {
        await no.click()
        await wait(350)
        s = await health(page)
        if (errors.length) fails.push(`${tag} (틀린 답 뒤): 페이지 오류 — ${errors[0]}`)
        if (!s.alive || s.recover || !s.probe) fails.push(`${tag} (틀린 답 뒤): 앱/말풍선이 사라짐`)
        else if (s.inside === false || s.btnOk === false) fails.push(`${tag} (틀린 답 뒤): 말풍선이 잘림`)
      }
    }
  }

  // 링크 버튼을 꾹(0.7초) 눌렀다 떼도 반응해야 합니다
  await openMail(page)
  // ★ 판 가운데쯤에 놓고 누릅니다 — 너무 위에 두면 메일 위쪽 도구줄에 가려져 엉뚱한 곳을 누르게 됩니다
  const half = (await place(page, '[data-role=mail-link]', 200)).paneH / 2
  const at = await place(page, '[data-role=mail-link]', Math.round(half))
  await wait(150)
  errors.length = 0
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await wait(700)
  await page.mouse.up()
  await wait(450)
  const s = await health(page)
  if (errors.length || !s.alive || !s.probe) fails.push(`${name} 링크 꾹 누르기: 반응 없음 또는 오류`)

  console.log(`${name}: ${count}번 눌러 봄`)
  await page.close()
}

// 기기 3대씩 나란히 돌립니다(한 대씩 하면 10분 넘게 걸림)
for (let i = 0; i < DEVICES.length; i += 3) await Promise.all(DEVICES.slice(i, i + 3).map(runDevice))

console.log(`\n총 ${taps}번 누름 · 실패 ${fails.length}건`)
for (const f of fails) console.log('  ✗ ' + f)
process.exit(fails.length ? 1 : 0)
