// 현장 상황 점검 (개발용) — node tools/field_check.mjs https://soobin-ui.github.io/phishing-expo/
//  ① 페이지를 받은 뒤 인터넷이 끊겨도 네 사건이 끝까지 되는가 (추가로 받아오는 파일이 없는가)
//  ② 콘솔 오류·실패한 요청이 없는가
//  ③ 화면 오류가 나면 스스로 첫 화면으로 복구되는가
//  ④ 끝난 뒤 30초 자동 복귀, 복귀 후 이름이 지워졌는가
import puppeteer from 'puppeteer-core'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const URL = process.argv[2] ?? 'https://soobin-ui.github.io/phishing-expo/'
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--disable-background-timer-throttling'] })
const out = []
const say = (ok, msg) => out.push(`${ok ? 'OK ' : 'BAD'} ${msg}`)

const page = await b.newPage()
await page.setViewport({ width: 1280, height: 800, isMobile: true, hasTouch: true })
const errors = [], failed = [], requests = []
page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 120)))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 120)) })
page.on('requestfailed', (r) => failed.push(r.url().slice(-60)))
page.on('request', (r) => requests.push(r.url()))
await page.goto(URL, { waitUntil: 'networkidle0' }); await wait(1500)
const loaded = requests.length
say(true, `처음 받을 때 요청 ${loaded}건, 실패 ${failed.length}건`)

// ① 인터넷 끊기
let OFF = true
await page.setOfflineMode(true)
const tapRole = async (role, ms = 1200, t = 20000) => { await page.waitForSelector(`[data-role="${role}"]`, { visible: true, timeout: t }); await wait(350); await page.evaluate((r) => document.querySelector(`[data-role="${r}"]`).click(), role); await wait(ms) }
const tapText = async (txt, ms = 1200) => { await page.waitForFunction((t) => [...document.querySelectorAll('button')].some((x) => x.innerText.includes(t) && x.getBoundingClientRect().width > 0), { timeout: 20000 }, txt); await wait(450); await page.evaluate((t) => [...document.querySelectorAll('button')].find((x) => x.innerText.includes(t) && x.getBoundingClientRect().width > 0).click(), txt); await wait(ms) }
const focus = async (role) => { await page.waitForSelector(`[data-role="${role}"]`, { visible: true, timeout: 20000 }); await wait(250); await (await page.$(`[data-role="${role}"]`)).click(); await wait(120) }
const has = (txt) => page.evaluate((t) => document.body.innerText.includes(t), txt)
const start = async (caseNo) => {
  if (!(await has('피싱 전문'))) { await page.setOfflineMode(false); await page.goto(URL, { waitUntil: 'networkidle0' }); await wait(1000); await page.setOfflineMode(OFF) }
  await tapText('수사 시작하기'); await tapText(caseNo)
  await page.waitForSelector('input', { visible: true }); await page.click('input'); await page.keyboard.type('홍길동', { delay: 15 }); await wait(200)
  await tapText('수사 시작하기', 1800)
}
const finishCard = async () => {
  await tapRole('flip-card', 1800, 30000)
  for (let i = 0; i < 3; i += 1) await tapRole('next-trick', 700)
  await tapRole('card-next', 2500)
  const ok = await has('피싱 대응 3원칙')
  await wait(1700); await tapText('처음으로', 1200)
  return ok && (await has('피싱 전문'))
}
const imagesOk = () => page.evaluate(() => [...document.images].filter((i) => i.getBoundingClientRect().width > 0).every((i) => i.complete && i.naturalWidth > 0))

try {
  // 1번
  await start('CASE 01'); await tapRole('rules-start'); await tapRole('open-phish', 1500)
  for (const sel of ['span.cursor-pointer', '[data-role=mail-link]', '[data-role=attachment]']) {
    for (let k = 0; k < 3 && !(await page.$('[data-role=flip-card]')); k += 1) {
      const el = await page.evaluateHandle((s) => [...document.querySelectorAll(s)].find((e) => !/bg-red|red-/.test(e.className)), sel)
      if (!el.asElement()) break
      await page.evaluate((e) => { const sc = e.closest('.overflow-y-auto'); if (sc) sc.scrollTop += e.getBoundingClientRect().top - sc.getBoundingClientRect().top - 120 }, el); await wait(300)
      await el.asElement().click(); await wait(900)
      if (await page.$('[data-role=probe-ok]')) { await page.evaluate(() => document.querySelector('[data-role=probe-ok]').click()); await wait(900) }
    }
  }
  const found = await page.evaluate(() => document.querySelector('[data-role=found-count]')?.innerText.replace(/\s+/g, ''))
  for (let i = 0; i < 6 && !(await page.$('[data-role=flip-card]')); i += 1) { await page.evaluate(() => { const s = [...document.querySelectorAll('section span')].find((x) => !x.className && x.innerText.length > 10); s?.click() }); await wait(900) }
  say(await finishCard(), `인터넷 끊긴 채 1번 완주 (찾은 문구 ${found ?? '4/4 → 카드'})`)
} catch (e) { say(false, '1번: ' + String(e.message).slice(0, 100)) }

try {
  // 2번
  await start('CASE 02'); await tapRole('rules-start', 700); await tapRole('unlock', 500)
  const tapI = async (t, ms) => { await page.evaluate((t) => [...document.querySelectorAll('[data-i]')].find((x) => x.textContent.includes(t)).click(), t); await wait(ms) }
  await page.click('[data-app="sms"]'); await wait(300); await page.click('[data-go="sms_scam"]'); await wait(300); await tapI('카카오톡 ID', 3200)
  await tapRole('move-app', 500); await page.click('[data-go="talk_scam"]'); await wait(300)
  for (const t of ['haeon-interview', '모두 허용해', '482913']) await tapI(t, 3200)
  await tapRole('folder', 900)
  for (const k of [0, 1, 2, 3]) { await page.click(`[data-k="${k}"]`); await wait(650) }
  await wait(1600); await tapRole('board-next', 4000)
  say((await imagesOk()) && (await finishCard()), '인터넷 끊긴 채 2번 완주')
} catch (e) { say(false, '2번: ' + String(e.message).slice(0, 100)) }

try {
  // 3번 — 당하는 길(사이트에 입력) → 다시 → 먼저 확인
  await start('CASE 03'); await tapRole('brief-start'); await tapRole('open-channel', 2500); await tapRole('smish-open', 2500)
  const img3 = await imagesOk()
  await focus('smish-name'); await page.keyboard.type('홍길동'); await focus('smish-phone'); await page.keyboard.type('01098765432'); await wait(300)
  await tapRole('smish-send', 1200); await tapRole('smish-popup-ok', 1800)
  await focus('smish-code'); await page.keyboard.type('482913'); await wait(400)
  await tapRole('smish-verify-code', 1500)
  for (let i = 0; i < 3; i += 1) { const ok = await page.$('[data-role=smish-popup-ok]'); if (ok) { await page.evaluate(() => document.querySelector('[data-role=smish-popup-ok]').click()); await wait(1200) } }
  if (await page.$('[data-role=smish-view]')) { await page.evaluate(() => document.querySelector('[data-role=smish-view]')?.click()); await wait(3000) }
  await page.waitForSelector('[data-role=smish-damage]', { visible: true, timeout: 25000 }); await wait(1200)
  const dmg = await page.evaluate(() => (document.querySelector('[data-role=smish-damage]')?.innerText || '').length > 80)
  await tapRole('smish-retry', 1500); await tapRole('smish-verify', 2500)
  for (let i = 0; i < 8 && !(await page.$('[data-role=flip-card]')); i += 1) { if (await page.$('[data-role=smish-verify-next]')) await page.evaluate(() => document.querySelector('[data-role=smish-verify-next]').click()); await wait(1500) }
  say(img3 && dmg && (await finishCard()), `인터넷 끊긴 채 3번 완주 (피해 화면 문장 ${dmg ? '확인' : '없음'})`)
} catch (e) { say(false, '3번: ' + String(e.message).slice(0, 100)) }

try {
  // 4번 — 결제까지 당함 → 다시 해보기 → 안내(STOP) → 카드
  const VALUES = { name: '홍길동', phone: '01098765432', rrn: '9001011234567', card: '5327123412340412', exp: '0929', cvc: '123', pw: '12' }
  const fillAll = async () => { const ids = await page.evaluate(() => [...document.querySelectorAll('input[data-role^="vip-field-"]')].map((i) => i.getAttribute('data-role').slice(10))); for (const id of ids) { await page.click(`input[data-role="vip-field-${id}"]`); await page.type(`input[data-role="vip-field-${id}"]`, VALUES[id] ?? '1234', { delay: 10 }) } await wait(300) }
  await start('CASE 04'); await tapRole('brief-start'); await tapRole('vip-open', 1000)
  const img4 = await imagesOk()
  await fillAll(); await tapRole('vip-verify-next'); await tapRole('vip-seat-next'); await fillAll(); await tapRole('vip-pay', 1000)
  await page.waitForSelector('[data-role="vip-retry"]', { visible: true, timeout: 40000 }); await wait(1200)
  const dmg = await has('범인이 노린 것은')
  await tapRole('vip-retry', 1500); await tapRole('vip-open', 1500)
  for (let i = 0; i < 8 && !(await page.$('[data-role=flip-card]')); i += 1) { if (await page.$('[data-role=vip-stop-next]')) await page.evaluate(() => document.querySelector('[data-role=vip-stop-next]').click()); await wait(2600) }
  say(img4 && dmg && (await finishCard()), `인터넷 끊긴 채 4번 완주 (피해 화면 문장 ${dmg ? '확인' : '없음'})`)
} catch (e) { say(false, '4번: ' + String(e.message).slice(0, 100)) }

const first = new Set(requests.slice(0, loaded))
const late = [...new Set(requests.slice(loaded).filter((u) => !first.has(u) && !u.startsWith('data:') && !u.includes('?t=')))]
say(late.length === 0, `처음엔 안 받고 체험 도중에야 받아온 파일 ${late.length}건: ${late.map((u) => u.split('/').pop()).join(', ')}`)
console.log('처음 받은 파일: ' + [...first].map((u) => u.split('/').pop().slice(0, 40)).join(', '))
say(errors.length === 0, `콘솔·페이지 오류 ${errors.length}건 ${errors[0] ?? ''}`)
OFF = false
await page.setOfflineMode(false)

// ③ 오류 자동 복구
try {
  await page.goto(`${URL}?topic=rnd&name=a&t=${Date.now()}`); await tapRole('rules-start'); await tapRole('open-phish', 1500)
  const shown = await page.evaluate(async () => { const o = String.prototype.padStart; String.prototype.padStart = function () { throw new Error('TEST') }; document.querySelector('[data-role=hint]').click(); await new Promise((r) => setTimeout(r, 700)); const s = !!document.querySelector('[data-role=error-recover]'); String.prototype.padStart = o; return s })
  await wait(3300)
  const back = await page.evaluate(() => !document.querySelector('[data-role=error-recover]') && document.getElementById('root').children.length > 0)
  say(shown && back, `강제 오류 → 안내 화면 ${shown ? '뜸' : '안 뜸'} → 3초 뒤 ${back ? '스스로 복구' : '복구 안 됨'}`)
} catch (e) { say(false, '오류 복구: ' + String(e.message).slice(0, 100)) }

// ④ 마지막 화면 30초 자동 복귀 + 이름 지워짐
try {
  await page.goto(`${URL}?t=${Date.now()}`, { waitUntil: 'networkidle0' }); await wait(800)
  await start('CASE 03'); await tapRole('brief-start'); await tapRole('open-channel', 2500); await tapRole('smish-reply', 4000); await tapRole('smish-verify', 2500)
  for (let i = 0; i < 8 && !(await page.$('[data-role=flip-card]')); i += 1) { if (await page.$('[data-role=smish-verify-next]')) await page.evaluate(() => document.querySelector('[data-role=smish-verify-next]').click()); await wait(1500) }
  await tapRole('flip-card', 1500, 30000)
  for (let i = 0; i < 3; i += 1) await tapRole('next-trick', 700) // 수법을 다 봐야 [이렇게 예방하세요]가 나옵니다
  await tapRole('card-next', 2000)
  const t0 = Date.now()
  await page.waitForFunction(() => document.body.innerText.includes('피싱 전문'), { timeout: 45000 })
  const sec = Math.round((Date.now() - t0) / 1000)
  await tapText('수사 시작하기'); await tapText('CASE 03')
  const v = await page.$eval('input', (i) => i.value)
  say(sec >= 25 && sec <= 36 && v === '', `마지막 화면 자동 복귀 ${sec}초 · 복귀 뒤 이름 칸 ${v === '' ? '비어 있음' : '남아 있음: ' + v}`)
} catch (e) { say(false, '자동 복귀: ' + String(e.message).slice(0, 100)) }

console.log(out.join('\n'))
await b.close()
