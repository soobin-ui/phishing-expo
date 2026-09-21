/**
 * 전 사건 '마구 눌러 보기' 점검 (개발용) — 2026-09-21 행사 전 전체 점검.
 *
 *   node tools/monkey_check.mjs http://localhost:5176/
 *   node tools/monkey_check.mjs <URL> --seeds=4 --steps=160 --topics=rnd,job
 *   node tools/monkey_check.mjs <URL> --replay=job:탭가로-1280x800:3     # 실패한 한 판만 다시(같은 순서로)
 *
 * 화면 구성을 몰라도 되는 점검입니다. 첫 화면에서 시작해 사건을 고르고,
 * 화면에 보이는 '누를 수 있는 것'을 관람객처럼 아무거나(가끔 두 번 연달아, 가끔 엉뚱한 곳을) 눌러 가며 끝까지 갑니다.
 * 입력창이 보이면 글자를 채웁니다. 매 걸음마다 확인하는 것:
 *   1) 페이지 오류(예: Maximum update depth exceeded)
 *   2) 앱이 내려갔는가(#root 비었음) · 오류 복구 화면이 떴는가
 *   3) 멈춤 — 누를 것이 하나도 없는 채로 12초 이상
 *   4) 옆으로 밀림(가로 넘침)
 * 그리고 판마다 '마무리 화면까지 갔는가'를 셉니다.
 *
 * 순서는 씨앗값(seed)으로 정해져서, 실패한 판은 --replay 로 똑같이 다시 볼 수 있습니다.
 */
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const argv = process.argv.slice(2)
const opt = (k, d) => argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d
const URL = argv.find((a) => a.startsWith('http')) ?? 'http://localhost:5176/'
const SEEDS = Number(opt('seeds', 2))
const STEPS = Number(opt('steps', 140))
const PAR = Number(opt('par', 4))
const REPLAY = opt('replay', '')
const AUDIT = argv.includes('--audit') // 화면마다 스크롤이 생긴 칸·잘린 글자를 모읍니다(반응형 감사)
const SHOTS = argv.includes('--shots') // 처음 보는 화면마다 PNG → tools/shots/audit/<해상도>/
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'shots', AUDIT ? 'audit' : 'monkey')
mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const TOPICS = { rnd: 'CASE 01', job: 'CASE 02', family: 'CASE 03', agency: 'CASE 04' }
const DEVICES = [
  ['폰-390x844', 390, 844, true],
  ['탭세로-820x1180', 820, 1180, true],
  ['탭가로-1280x800', 1280, 800, true],
  ['탭가로-1024x768', 1024, 768, true],
  ['노트북-1366x768', 1366, 768, false],
]

// --devices=1280x800,1920x1080 처럼 주면 그 해상도들만 (가로 화면 전수 점검용 — tools/responsive_matrix.txt)
if (opt('devices', '')) {
  DEVICES.length = 0
  for (const wh of opt('devices', '').split(',')) {
    const [w, h] = wh.split('x').map(Number)
    DEVICES.push([wh, w, h, false])
  }
}

/**
 * [감사] 지금 화면에서 ① 스크롤이 생긴 칸 ② 잘려서 안 보이는 글자·버튼 ③ 화면 이름표(같은 화면인지 구분용)
 */
const audit = (page) =>
  page.evaluate(() => {
    const W = innerWidth
    const H = innerHeight
    const name = (el) =>
      el.getAttribute('data-scroll') || el.getAttribute('data-role') || (el.hasAttribute('data-scroll-screen') ? 'screen' : '') || (el.classList.contains('body') && el.closest('.fx') ? 'phone-app' : '') || String(el.className).slice(0, 46)
    const scrolls = []
    for (const el of document.querySelectorAll('*')) {
      const over = el.scrollHeight - el.clientHeight
      if (over <= 4 || el.clientHeight < 40) continue
      const oy = getComputedStyle(el).overflowY
      if (oy !== 'auto' && oy !== 'scroll') continue
      const r = el.getBoundingClientRect()
      if (r.width < 40 || r.bottom < 0 || r.top > H) continue
      scrolls.push({ id: name(el), over: Math.round(over), view: Math.round(el.clientHeight) })
    }
    const DECOR = /tape-marquee|pointer-events-none|backdrop|spark/
    const isDecor = (el) => {
      for (let q = el; q && q !== document.body; q = q.parentElement)
        if (q.getAttribute?.('aria-hidden') === 'true' || DECOR.test(String(q.className || ''))) return true
      return false
    }
    const clipped = []
    for (const el of document.querySelectorAll('button, a, input, h1, h2, h3, p, b, span, li')) {
      if (isDecor(el)) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.15) continue
      const r = el.getBoundingClientRect()
      if (r.width < 8 || r.height < 8) continue
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
      if (!own && !['BUTTON', 'A', 'INPUT'].includes(el.tagName)) continue
      let box = { l: 0, t: 0, r: W, b: H }
      let scrollable = false
      for (let p = el.parentElement; p; p = p.parentElement) {
        const c = getComputedStyle(p)
        if (/auto|scroll/.test(c.overflowY + c.overflowX)) scrollable = true
        if (/hidden|clip/.test(c.overflowY + c.overflowX)) {
          const q = p.getBoundingClientRect()
          box = { l: Math.max(box.l, q.left), t: Math.max(box.t, q.top), r: Math.min(box.r, q.right), b: Math.min(box.b, q.bottom) }
        }
      }
      if (scrollable) continue
      const m = cs.transform && cs.transform !== 'none' ? cs.transform.match(/matrix\(([^,]+),/) : null
      if (m && Math.abs(parseFloat(m[1]) - 1) > 0.005) continue
      const cut = Math.max(box.l - r.left, box.t - r.top, r.right - box.r, r.bottom - box.b)
      if (cut > 10) clipped.push(`${el.tagName}"${(el.textContent || '').trim().slice(0, 16)}" ${Math.round(cut)}px`)
      if (clipped.length >= 3) break
    }
    const roles = [
      ...new Set(
        [...document.querySelectorAll('[data-role]')]
          .filter((e) => e.getBoundingClientRect().width > 4)
          .map((e) => e.getAttribute('data-role').replace(/-?\d+$/, '')),
      ),
    ].sort()
    const sig = roles.slice(0, 7).join(',') + '|' + document.body.innerText.replace(/[0-9\s]/g, '').slice(0, 24)
    return { sig, scrolls, clipped, rem: parseFloat(getComputedStyle(document.documentElement).fontSize) }
  })

const rng = (seed) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** 지금 화면에서 실제로 누를 수 있는 것들(가려진 것·꺼진 것 제외) + 앱 상태 */
const scan = (page) =>
  page.evaluate(() => {
    const W = innerWidth
    const H = innerHeight
    const root = document.getElementById('root')
    const sel =
      'button, a, input, textarea, [role=button], [data-role], [data-go], [data-app], [data-k], [data-i], [data-spot], span.cursor-pointer'
    const seen = new Set()
    const items = []
    for (const el of document.querySelectorAll(sel)) {
      if (el.disabled || el.getAttribute('aria-hidden') === 'true') continue
      const r = el.getBoundingClientRect()
      if (r.width < 6 || r.height < 6) continue
      if (r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) continue
      const x = Math.min(Math.max(r.left + r.width / 2, 1), W - 1)
      const y = Math.min(Math.max(r.top + Math.min(r.height / 2, 40), 1), H - 1)
      const hit = document.elementFromPoint(x, y)
      if (!hit || !(el === hit || el.contains(hit))) continue
      const key = `${Math.round(x)}:${Math.round(y)}`
      if (seen.has(key)) continue
      seen.add(key)
      const isInput = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'
      // 표시만 하는 칸(남은 시간·사이트 테두리 등)은 뺍니다 — 실제로 눌리는 것만
      const pressable =
        isInput || ['BUTTON', 'A'].includes(el.tagName) || el.getAttribute('role') === 'button' || getComputedStyle(el).cursor === 'pointer'
      if (!pressable) continue
      items.push({
        x,
        y,
        input: isInput,
        filled: isInput && !!el.value,
        // 글자가 계속 바뀌는 것(초읽기 등)을 '새것'으로 착각하지 않게, 이름표가 있으면 이름표만 씁니다
        label:
          el.dataset.role || el.dataset.go || el.dataset.app || el.dataset.spot ||
          '|' + (el.innerText || el.placeholder || '').replace(/[0-9]/g, '').slice(0, 18).replace(/\s+/g, ' '),
      })
    }
    const text = document.body.innerText
    return {
      items,
      alive: root.children.length > 0,
      recover: !!document.querySelector('[data-role=error-recover]'),
      hOverflow: Math.max(0, document.documentElement.scrollWidth - W),
      ended: text.includes('피싱 대응 3원칙') || text.includes('수사 종료'),
      intro: text.includes('피싱 전문') && text.includes('수사 시작하기'),
      sig: text.slice(0, 400),
    }
  })

async function runOne(topic, device, seed) {
  const [dname, w, h, mobile] = device
  const id = `${topic}:${dname}:${seed}`
  const rand = rng(seed * 7919 + topic.length * 31 + w)
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    protocolTimeout: 45000,
    args: ['--hide-scrollbars', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
  })
  const res = { id, problems: [], ended: false, steps: 0, trail: [], screens: new Map(), rem: 0 }
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile })
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)))
    page.on('console', (m) => {
      if (m.type() === 'error' && /Maximum update|Minified React|Uncaught|ErrorBoundary/.test(m.text()))
        errors.push('console: ' + m.text().slice(0, 160))
    })
    await page.goto(`${URL}?t=${Date.now()}`, { waitUntil: 'domcontentloaded' })
    await wait(1500)

    /** [감사] 지금 화면을 기록 — 처음 보는 화면이면 사진도 */
    let shotNo = 0
    const note = async () => {
      if (!AUDIT) return
      const a = await audit(page).catch(() => null)
      if (!a) return
      res.rem = a.rem
      const prev = res.screens.get(a.sig)
      if (!prev) {
        shotNo += 1
        if (SHOTS) {
          const dir = join(OUT, dname)
          mkdirSync(dir, { recursive: true })
          await page.screenshot({ path: join(dir, `${topic}-s${seed}-${String(shotNo).padStart(2, '0')}.png`) }).catch(() => {})
        }
      }
      const cur = prev ?? { scrolls: new Map(), clipped: new Set(), shot: shotNo }
      for (const sc of a.scrolls) cur.scrolls.set(sc.id, Math.max(cur.scrolls.get(sc.id) ?? 0, sc.over))
      for (const c of a.clipped) cur.clipped.add(c)
      res.screens.set(a.sig, cur)
    }

    const clickText = async (t) => {
      const pt = await page.evaluate((t) => {
        const el = [...document.querySelectorAll('button')].find((b) => b.innerText.includes(t))
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      }, t)
      if (!pt) throw new Error(`"${t}" 버튼을 찾지 못함`)
      await page.mouse.click(pt.x, pt.y)
    }
    // 첫 화면 → 사건 고르기 → 이름 → 시작 (여기까지는 정해진 길로)
    await note()
    await clickText('수사 시작하기')
    await wait(1200)
    await note()
    await clickText(TOPICS[topic])
    await wait(1200)
    await note()
    await page.click('input')
    await page.type('input', '홍길동', { delay: 20 })
    await wait(200)
    await clickText('수사 시작하기')
    await wait(1500)

    const clicked = new Map()
    let idleSince = Date.now()
    let lastSig = ''
    const began = Date.now()
    for (let step = 0; step < STEPS; step += 1) {
      res.steps = step
      const s = await scan(page)
      if (errors.length) break
      if (!s.alive) {
        res.problems.push('앱이 내려감(빈 화면)')
        break
      }
      if (s.recover) {
        res.problems.push('오류 복구 화면이 뜸')
        break
      }
      if (s.hOverflow > 2) res.problems.push(`가로 넘침 ${s.hOverflow}px @${step}`)
      await note()
      if (s.ended) {
        res.ended = true
        break
      }
      if (s.intro) {
        res.problems.push('끝나기 전에 첫 화면으로 돌아감')
        break
      }
      if (s.sig !== lastSig) {
        lastSig = s.sig
        idleSince = Date.now()
      }
      const usable = s.items.filter((i) => !(i.input && i.filled))
      if (!usable.length) {
        if (Date.now() - idleSince > 12000) {
          res.problems.push(`멈춤 — 누를 것이 없음: "${s.sig.slice(0, 60).replace(/\s+/g, ' ')}"`)
          break
        }
        await wait(500)
        step -= 1
        continue
      }
      if (Date.now() - began > 420000) break
      // 아직 덜 눌러 본 것을 더 자주 고릅니다 — 같은 곳만 맴돌지 않고 끝까지 가도록
      const weights = usable.map((i) => 1 / (1 + (clicked.get(i.label) ?? 0)) ** 2)
      let pickAt = rand() * weights.reduce((a, b) => a + b, 0)
      let it = usable[usable.length - 1]
      for (let k = 0; k < usable.length; k += 1) {
        pickAt -= weights[k]
        if (pickAt <= 0) {
          it = usable[k]
          break
        }
      }
      clicked.set(it.label, (clicked.get(it.label) ?? 0) + 1)
      res.trail.push(it.label)
      if (it.input) {
        await page.mouse.click(it.x, it.y)
        // 자릿수를 채워야 다음 버튼이 켜지는 칸이 있어서(전화·카드번호 등) 넉넉히 칩니다. 넘치는 자리는 앱이 잘라냅니다
        await page.keyboard.type(/name|이름/.test(it.label) ? '홍길동' : '0101234567812345', { delay: 8 })
        if (rand() < 0.5) await page.keyboard.press('Enter')
      } else if (!AUDIT && rand() < 0.12) {
        await page.mouse.click(5 + rand() * (w - 10), 5 + rand() * (h - 10)) // 엉뚱한 곳
      } else {
        await page.mouse.click(it.x, it.y)
        if (!AUDIT && rand() < 0.15) {
          await wait(60)
          await page.mouse.click(it.x, it.y) // 연달아 두 번
        }
      }
      await wait(AUDIT ? 650 : 150 + rand() * 500)
    }
    if (errors.length) res.problems.push(`페이지 오류: ${errors[0]}`)
    if (res.problems.length)
      await page.screenshot({ path: join(OUT, id.replace(/:/g, '_') + '.png') }).catch(() => {})
  } catch (e) {
    res.problems.push(`점검 도구 오류: ${String(e.message).slice(0, 140)}`)
  } finally {
    await browser.close().catch(() => {})
  }
  return res
}

const jobs = []
if (REPLAY) {
  const [t, d, s] = REPLAY.split(':')
  jobs.push([t, DEVICES.find((x) => x[0] === d), Number(s)])
} else {
  const topics = opt('topics', Object.keys(TOPICS).join(',')).split(',')
  for (const t of topics) for (const d of DEVICES) for (let s = 1; s <= SEEDS; s += 1) jobs.push([t, d, s])
}
console.log(`대상 ${URL} · ${jobs.length}판 · 판마다 최대 ${STEPS}걸음\n`)
const results = []
for (let i = 0; i < jobs.length; i += PAR) {
  const batch = await Promise.all(jobs.slice(i, i + PAR).map((j) => runOne(...j)))
  for (const r of batch) {
    console.log(
      `${r.problems.length ? '✗' : '✓'} ${r.id} · ${r.steps}걸음 · ${r.ended ? '끝까지 감' : '끝까지 못 감'}${r.problems.length ? ' · ' + r.problems.join(' / ') : ''}`,
    )
    if (r.problems.length || REPLAY) console.log('    지나온 길: ' + r.trail.slice(-12).join(' → '))
  }
  results.push(...batch)
}
if (AUDIT) {
  /*
    해상도별로: 스크롤이 생긴 칸 · 잘린 글자.
    ★ 아래 칸들은 '밀어서 읽는 것이 원래 모습'이라 문제로 치지 않습니다(그 밖의 스크롤은 전부 ✗).
      mail       1번 메일 본문·받은편지함 — 실제 메일처럼 (사용자 결정으로 제외)
      thread     문자·메신저 대화 — 실제 메신저처럼 새 말이 아래에 쌓임. 선택지는 늘 화면 안에 있음
      phone-app  2번 피해자 휴대폰 속 앱 화면 — 실제 휴대폰처럼
      review     검거 카드 뒷면 '다시 보기' — 방금 그 메일·문자를 다시 띄우고 해당 자리로 저절로 스크롤
      site-home  4번 가짜 사이트 첫 화면 — 브리핑·팝업 뒤에 흐리게 깔리는 배경(관람객이 밀 일이 없음)
  */
  const NATURAL = /^(mail|thread|phone-app|review|site-home)$/
  console.log('\n── 반응형 감사 ──')
  for (const d of DEVICES) {
    const rs = results.filter((r) => r.id.split(':')[1] === d[0])
    const lines = []
    let count = 0
    for (const r of rs)
      for (const [sig, v] of r.screens) {
        count += 1
        const sc = [...v.scrolls].filter(([id]) => !NATURAL.test(id)).map(([id, over]) => `${id} +${over}px`)
        if (sc.length || v.clipped.size)
          lines.push(
            `   ${r.id.split(':')[0]} #${v.shot} [${sig.slice(0, 50)}] ${sc.length ? '스크롤: ' + sc.join(', ') : ''} ${v.clipped.size ? '잘림: ' + [...v.clipped].join(' | ') : ''}`,
          )
      }
    console.log(`${lines.length ? '✗' : '✓'} ${d[0]} (1rem=${rs[0]?.rem?.toFixed(1)}px · ${count}화면)`)
    for (const l of [...new Set(lines)].slice(0, 40)) console.log(l)
  }
}
const bad = results.filter((r) => r.problems.length)
console.log(`\n${results.length}판 중 문제 ${bad.length}판`)
for (const t of Object.keys(TOPICS)) {
  const rs = results.filter((r) => r.id.startsWith(t + ':'))
  if (rs.length) console.log(`  ${TOPICS[t]}: ${rs.filter((r) => r.ended).length}/${rs.length}판 끝까지 감`)
}
process.exit(bad.length ? 1 : 0)
