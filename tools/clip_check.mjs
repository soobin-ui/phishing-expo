/**
 * 전 기기 × 전 화면 '잘림' 검사 (개발용).
 *
 *   node tools/clip_check.mjs http://localhost:5175/
 *   node tools/clip_check.mjs <URL> --shots     # 잘린 화면만 PNG 로 남김
 *
 * 체험을 스스로 끝까지 눌러 가며(입력창은 적당히 채우며) 화면마다 이걸 봅니다.
 *   ① 문서가 옆으로 밀렸는가
 *   ② 화면 안 스크롤 칸에 스크롤이 생겼는가 (= 한 화면에 안 들어옴)
 *   ③ 글자·버튼이 화면 밖이나 잘리는 상자 밖으로 삐져나갔는가  ← 카드가 잘리던 게 이것
 *
 * ★ 장식(테이프·배경·말풍선 꼬리)은 일부러 밖으로 나가므로 봐줍니다.
 */
import { mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv.find((a) => a.startsWith('http')) ?? 'http://localhost:5175/'
const SHOTS = process.argv.includes('--shots')
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'shots', 'clip')
if (SHOTS) {
  rmSync(OUT, { recursive: true, force: true })
  mkdirSync(OUT, { recursive: true })
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

/** [이름, 폭, 높이] — 부스에서 쓸 기기 + 흔한 크기 (가로 위주, 폰 세로도) */
const DEVICES = [
  ['아이패드에어11-1180x820', 1180, 820],
  ['아이패드에어11-툴바-1180x744', 1180, 744],
  ['아이패드에어13-1376x1032', 1376, 1032],
  ['아이패드9-1080x810', 1080, 810],
  ['아이패드미니-1133x744', 1133, 744],
  ['갤탭S9FE-1280x800', 1280, 800],
  ['갤탭세로-800x1280', 800, 1280],
  ['노트북-1366x768', 1366, 768],
  ['노트북-1280x720', 1280, 720],
  ['폰-390x844', 390, 844],
]

/*
  --devices=1280x800,1920x1080,...  처럼 주면 그 해상도들만 봅니다(가로 화면 전수 점검용).
  tools/responsive_matrix.txt 에 노트북·태블릿 가로 해상도 목록이 있습니다.
*/
const custom = process.argv.find((a) => a.startsWith('--devices='))
if (custom) {
  DEVICES.length = 0
  for (const wh of custom.split('=')[1].split(',')) {
    const [w, h] = wh.split('x').map(Number)
    DEVICES.push([wh, w, h])
  }
}

/** 눌러서 앞으로 나아가는 자리 — 앞에 있을수록 먼저 */
const ADVANCE = [
  'brief-start', 'rules-start', 'open-channel', 'unlock', 'move-popup', 'move-app',
  'mail-link', 'attachment', 'smish-page', 'smish-send', 'smish-verify-code', 'smish-view',
  'smish-popup-ok', 'smish-verify-next', 'smish-damage', 'smish-retry',
  'vip-open', 'vip-popup', 'vip-stop-next', 'vip-site', 'vip-flood', 'vip-damage', 'vip-done', 'vip-retry',
  'probe', 'probe-retry', 'folder', 'evidence-done', 'board-card', 'board-next',
  'hint', 'pick-trick', 'next-trick', 'flip-card', 'card-next', 'to-inbox', 'nav-home',
]

const inspect = (page) =>
  page.evaluate(() => {
    const W = innerWidth, H = innerHeight
    const out = { hScroll: 0, vScroll: 0, clipped: [] }
    out.hScroll = Math.max(0, document.documentElement.scrollWidth - W)
    for (const s of document.querySelectorAll('[data-scroll-screen]')) {
      out.vScroll = Math.max(out.vScroll, s.scrollHeight - s.clientHeight)
    }
    /** 일부러 화면 밖으로 나가는 장식들 — 그 안의 글자까지 전부 봐줍니다 */
    const DECOR = /tape-marquee|pointer-events-none|backdrop|spark/
    const isDecor = (el) => {
      let q = el
      while (q && q !== document.body) {
        if (q.getAttribute?.('aria-hidden') === 'true' || DECOR.test(String(q.className || ''))) return true
        q = q.parentElement
      }
      return false
    }
    /** 커졌다 작아지는 연출(scale) 중이면 잠깐 삐져나오는 게 정상입니다 */
    const isPulsing = (el) => {
      const m = getComputedStyle(el).transform
      if (!m || m === 'none') return false
      const n = m.match(/matrix\(([^,]+),/)
      return n ? Math.abs(parseFloat(n[1]) - 1) > 0.005 : false
    }

    /**
     * 이 요소를 자르는 조상들의 안쪽 사각형.
     * 스스로 스크롤되는 칸(메일 본문·받은편지함·가짜 사이트)은 밀어서 볼 수 있으니 '잘림'이 아닙니다 —
     * 다만 **진행 버튼**은 스크롤 칸 안에 있어도 보여야 합니다(안 보이면 여기서 끝난 줄 압니다).
     */
    const clipBox = (el) => {
      let box = { l: 0, t: 0, r: W, b: H }
      let scrollable = false
      let p = el.parentElement
      const cuts = (v) => v === 'hidden' || v === 'clip'
      const scrolls = (v) => v === 'auto' || v === 'scroll'
      while (p) {
        const cs = getComputedStyle(p)
        if (scrolls(cs.overflowX) || scrolls(cs.overflowY)) scrollable = true
        if (cuts(cs.overflowX) || cuts(cs.overflowY)) {
          const r = p.getBoundingClientRect()
          box = { l: Math.max(box.l, r.left), t: Math.max(box.t, r.top), r: Math.min(box.r, r.right), b: Math.min(box.b, r.bottom) }
        }
        p = p.parentElement
      }
      return { box, scrollable }
    }
    /** 다음으로 넘어가는 주 버튼인가 — 색이 진한 큰 버튼 또는 '-next' 자리 */
    const isCTA = (el) => {
      if (el.tagName !== 'BUTTON') return false
      const role = el.getAttribute('data-role') || ''
      // 받은편지함의 메일 줄들은 '목록'이라 아래로 밀어 보는 게 정상입니다(진행 버튼이 아님)
      if (/^open-(decoy|phish)$/.test(role)) return false
      if (/next|send|start|pay|done|verify|open|retry/.test(role)) return true
      const c = String(el.className)
      return /bg-gold|bg-\[#d4143a\]|bg-\[#1668c4\]/.test(c) && el.getBoundingClientRect().width > 120
    }

    // 글자가 직접 들어 있거나 누를 수 있는 것만 — 그것이 잘리면 사람이 못 읽거나 못 누릅니다
    const cands = [...document.querySelectorAll('button, a, input, h1, h2, h3, p, b, span, li')].filter((el) => {
      if (isDecor(el)) return false
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.15) return false
      const r = el.getBoundingClientRect()
      if (r.width < 8 || r.height < 8) return false
      // 글자를 직접 가진 것 또는 버튼/입력창
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
      return own || ['BUTTON', 'A', 'INPUT'].includes(el.tagName)
    })

    for (const el of cands) {
      const r = el.getBoundingClientRect()
      const { box: c, scrollable } = clipBox(el)
      // 스크롤되는 칸 안의 '읽을거리'는 밀어서 보면 되니 넘어갑니다. 진행 버튼은 봐주지 않습니다.
      if (scrollable && !isCTA(el)) continue
      const cut = Math.max(c.l - r.left, c.t - r.top, r.right - c.r, r.bottom - c.b)
      if (cut > 14 && !isPulsing(el)) {
        out.clipped.push(`${el.tagName}"${(el.textContent || '').trim().slice(0, 18)}" ${Math.round(cut)}px 잘림`)
        if (out.clipped.length >= 4) break
      }
    }
    return out
  })

/** 화면에 보이는 빈 입력창을 적당히 채웁니다 */
async function fillInputs(page) {
  const sels = await page.evaluate(() =>
    [...document.querySelectorAll('input')]
      .filter((i) => !i.value && i.offsetParent !== null)
      .map((i) => i.getAttribute('data-role') || i.type || 'text'),
  )
  for (const role of sels) {
    const sample = /phone|card|rrn|code|exp|pw|tel|number/i.test(role) ? '01012345678' : '전수빈'
    try {
      await page.evaluate((r) => {
        const el = [...document.querySelectorAll('input')].find(
          (i) => !i.value && i.offsetParent !== null && (i.getAttribute('data-role') || i.type) === r,
        )
        el?.focus()
      }, role)
      await page.keyboard.type(sample, { delay: 8 })
    } catch { /* 없으면 넘어갑니다 */ }
  }
}

/** 지금 화면에서 앞으로 나아갈 자리를 하나 눌러 봅니다 */
async function advance(page, used) {
  return page.evaluate(
    (roles, used) => {
      const vis = (el) => {
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        return r.width > 8 && r.height > 8 && cs.visibility !== 'hidden' && +cs.opacity > 0.3
      }
      for (const role of roles) {
        const els = [...document.querySelectorAll(`[data-role="${role}"]`)].filter(vis)
        for (const el of els) {
          const key = role + (el.textContent || '').slice(0, 10)
          if (used.includes(key)) continue
          el.click()
          return key
        }
        if (els[0]) {
          els[0].click()
          return role + '(재방문)'
        }
      }
      // 이름난 자리가 없으면 그냥 눈에 보이는 버튼 하나
      const b = [...document.querySelectorAll('button')].filter(
        (e) => vis(e) && !['nav-back', 'nav-home'].includes(e.getAttribute('data-role')),
      )
      if (b.length) {
        b[0].click()
        return 'button:' + (b[0].textContent || '').trim().slice(0, 12)
      }
      return null
    },
    ADVANCE,
    used,
  )
}

const CASES = (process.env.ONLY_CASE ? [process.env.ONLY_CASE] : ['이메일 피싱', '악성앱', '스미싱', '기관·기업 사칭 피싱'])
const problems = []
let screens = 0

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
for (const [dev, w, h] of DEVICES) {
  for (const caseName of CASES) {
    const page = await browser.newPage()
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: w < 900, hasTouch: true })
    await page.goto(URL, { waitUntil: 'networkidle0' })
    await wait(800)

    const check = async (label) => {
      screens++
      const m = await inspect(page)
      if (m.hScroll > 1 || m.vScroll > 2 || m.clipped.length) {
        problems.push(`${dev} / ${caseName} / ${label} → 옆밀림 ${m.hScroll} 스크롤 ${m.vScroll} ${m.clipped.join(' | ')}`)
        if (SHOTS) await page.screenshot({ path: join(OUT, `${dev}--${caseName}--${label}.png`) })
      }
    }

    await check('01-첫화면')
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('수사 시작하기'))?.click())
    await wait(700)
    await check('02-사건고르기')
    await page.evaluate((c) => [...document.querySelectorAll('li,button')].reverse().find((b) => b.textContent?.includes(c))?.click(), caseName)
    await wait(700)
    await check('03-이름등록')
    await fillInputs(page)
    await page.keyboard.press('Enter')
    await wait(1200)

    const used = []
    for (let step = 0; step < 20; step++) {
      await check(`${String(step + 4).padStart(2, '0')}-진행`)
      await fillInputs(page)
      const did = await advance(page, used)
      if (!did) break
      used.push(did)
      await wait(600)
    }
    await page.close()
  }
  console.log(`${dev} 완료`)
}
await browser.close()

console.log(`\n총 ${screens} 화면 검사`)
if (problems.length) {
  console.log(`❌ 잘림 ${problems.length}건`)
  problems.slice(0, 60).forEach((p) => console.log('  -', p))
} else {
  console.log('✅ ALL OK — 어느 기기에서도 잘리는 화면 없음')
}
