import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence } from 'framer-motion'
import { DefenseCard } from '../components/DefenseCard'
import { fill, ui } from '../lib/content'
import fx from '../content/forensic.json'
import type { RedFlag } from '../types'
import './forensic.css'

/**
 * [취업·채용] 포렌식 수사 — 실제 사례(2026.5 금융감독원 공동기획, 화상면접 앱 사기) 순서 그대로.
 *
 *   규칙 → 피해자 휴대폰 잠금화면(새벽 결제 알림) → 앱을 뒤져 증거 4개
 *   → 찍은 증거가 증거 폴더로 날아 들어감 → '증거 수집 완료' → 반짝이는 폴더
 *   → 증거 보드에서 일어난 순서대로 붉은 실로 연결 → 검거 완료 카드(연구실과 같은 카드)
 *
 * ★ 증거는 메시지·카카오톡 두 앱에만 둡니다(설정 앱까지 뒤지게 하면 너무 어렵다는 피드백).
 * ★ 평범한 줄을 누르면 조사 기회 -1, 피해 기록(은행 알림 등)은 벌점 없이 안내만.
 * ★ 이모지 금지 — 아이콘은 모두 SVG.
 *
 * ★ 목표는 '모두가 수사관이 되는 것' — 시간 2분이 있지만 힌트 버튼은 언제든 누를 수 있고 감점도 없습니다.
 *   힌트를 켜면 다음 증거까지 가는 길(앱 → 대화방 → 말풍선)이 차례로 반짝입니다.
 *   기회 2번 이하 · 남은 시간 1분 이하 · 25초 동안 새 증거 없음 → 힌트 버튼이 반짝입니다.
 */
type Line = { t?: string; me?: boolean; ev?: string; day?: string; vid?: string; sec?: string; small?: string; info?: boolean; red?: boolean }
type ListItem = { go: string; av: string; color: string; name: string; last: string; time: string }
type Screen = { title: string; sub?: string; kakao?: boolean; list?: ListItem[]; thread?: Line[]; rows?: Line[] }
type Evidence = (typeof fx.evidence)[number]

const EVIDENCE = fx.evidence
const SCREENS = fx.screens as Record<string, Screen>
const CHANCES = 5
/** 조사 시간(초) — 잠금화면을 연 순간부터. 규칙 상자·증거 보드·증거가 날아가는 동안은 세지 않습니다 */
const TIME_LIMIT = 120
/** 이만큼 새 증거가 없으면 힌트 버튼이 반짝여 눌러 보라고 알립니다 */
const STUCK_SEC = 25
const SPOTS: Array<[number, number]> = [[2, 3], [53, 3], [2, 38], [53, 38]]

export function ForensicScreen({
  name,
  onReply,
  onSolved,
}: {
  /** 수사관 등록 때 입력한 이름 — 브리핑의 "취업준비생 {name}의 휴대폰" 자리에 들어갑니다(저장 안 함) */
  name: string
  /** 못 찾은 증거만큼 안전도를 깎습니다(마지막 등급에 반영) */
  onReply: (delta: number, gave: string | null) => void
  onSolved: (foundCount: number) => void
}) {
  const who = name.trim() || ui.name.fallback
  const [rules, setRules] = useState(true)
  const [stack, setStack] = useState<string[]>(['lock'])
  const [found, setFound] = useState<string[]>([])
  const [chances, setChances] = useState(CHANCES)
  const [seenApps, setSeenApps] = useState<string[]>([])
  const [toast, setToast] = useState<{ id: number; title: string; body: string } | null>(null)
  const [shake, setShake] = useState(0)
  const [flash, setFlash] = useState(0)
  const [snap, setSnap] = useState<{ id: number; text: string; ev: Evidence; no: number } | null>(null)
  const [folderOpen, setFolderOpen] = useState(false)
  const [bump, setBump] = useState(0)
  const [plus, setPlus] = useState<{ id: number; x: number; y: number } | null>(null)
  const [done, setDone] = useState(false)
  const [evBox, setEvBox] = useState(false)
  const [board, setBoard] = useState(false)
  const [card, setCard] = useState(false)
  const [misses, setMisses] = useState(0)
  const [wrongs, setWrongs] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT)
  const [lastFind, setLastFind] = useState(TIME_LIMIT)
  const [hintOn, setHintOn] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const busy = useRef(false)
  const shellRef = useRef<HTMLDivElement>(null)
  const phoneRef = useRef<HTMLElement>(null)

  /* 휴대폰 안 글자·여백은 24rem 폭 기준으로 짜여 있습니다. 가로 화면(노트북·가로 태블릿)에서는
     높이에 맞추느라 휴대폰이 좁아지므로, 좁아진 만큼 안쪽을 통째로 축소(zoom)해 진짜 휴대폰처럼 비율을 지킵니다 */
  useLayoutEffect(() => {
    const el = shellRef.current
    if (!el) return
    const fit = () => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      const inner = el.clientWidth - rem
      el.style.setProperty('--pz', String(Math.min(1, inner / (24 * rem))))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const folderRef = useRef<HTMLButtonElement>(null)
  const snapRef = useRef<HTMLDivElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)
  const ended = useRef(false)

  const cur = stack[stack.length - 1]

  /* 흔들기·번쩍·통통 — 스크롤 위치가 날아가지 않게 다시 그리지 않고 클래스만 다시 붙입니다 */
  const replay = (el: Element | null, cls: string) => {
    if (!el) return
    el.classList.remove(cls)
    void (el as HTMLElement).offsetWidth
    el.classList.add(cls)
  }
  useEffect(() => { if (shake) replay(phoneRef.current, 'shake') }, [shake])
  useEffect(() => { if (flash) replay(flashRef.current, 'go') }, [flash])
  const full = found.length === EVIDENCE.length
  /** 힌트가 가리키는 다음 증거 — 일어난 순서대로 아직 못 찾은 첫 번째 */
  const nextEv = EVIDENCE.find((e) => !found.includes(e.id))
  const hint = hintOn && nextEv && !full ? nextEv : null
  const running = !rules && cur !== 'lock' && !full && !ended.current
  const nudge = running && (chances <= 2 || timeLeft <= 60 || lastFind - timeLeft >= STUCK_SEC) && !hintOn

  /* 조사 시간 — 증거가 날아가는 중이거나 폴더 목록을 보는 동안은 멈춥니다 */
  useEffect(() => {
    if (!running || snap || evBox) return
    const id = window.setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000)
    return () => window.clearInterval(id)
  }, [running, snap, evBox])
  useEffect(() => {
    if (timeLeft > 0 || !running) return
    busy.current = true
    setTimedOut(true)
    showToast(fx.toast.timeout)
    window.setTimeout(() => toCard(found.length), 1300)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])
  useEffect(() => { if (bump && !full) replay(folderRef.current, 'bump') }, [bump]) // eslint-disable-line react-hooks/exhaustive-deps

  const go = (id: string) => {
    if (fx.apps.some((a) => a.id === id)) setSeenApps((v) => (v.includes(id) ? v : [...v, id]))
    setStack((s) => [...s, id])
  }
  const back = () => setStack((s) => (s.length > 2 ? s.slice(0, -1) : ['lock', 'home']))
  const home = () => setStack(['lock', 'home'])

  const showToast = (title: string, body = '', ms = 1700) => {
    const id = Date.now()
    setToast({ id, title, body })
    window.setTimeout(() => setToast((t) => (t?.id === id ? null : t)), ms)
  }

  /** 조사 끝 — 검거 카드로(증거를 다 모았으면 보드를 거친 뒤) */
  const toCard = (n: number) => {
    if (ended.current) return
    ended.current = true
    onReply(-15 * (EVIDENCE.length - n), null)
    setBoard(false)
    setCard(true)
  }

  /** 줄을 눌렀을 때 — 증거면 사진 찍어 폴더로, 아니면 조사 기회 -1 */
  const inspect = (line: Line) => {
    if (busy.current || ended.current) return
    if (line.info) return showToast(fx.toast.infoTitle, fx.toast.infoBody)
    if (line.ev) {
      const ev = EVIDENCE.find((e) => e.id === line.ev)!
      if (found.includes(ev.id)) return showToast(fx.toast.again, ev.label)
      busy.current = true
      setFlash((n) => n + 1)
      setSnap({ id: Date.now(), text: line.t ?? '', ev, no: found.length + 1 })
      return
    }
    const left = chances - 1
    setChances(left)
    setMisses((m) => m + 1)
    setShake((n) => n + 1)
    if (left <= 0) {
      busy.current = true
      showToast(fx.toast.out)
      window.setTimeout(() => toCard(found.length), 1300)
      return
    }
    showToast(fx.toast.missTitle, fill(fx.toast.missBody, { n: left }))
  }

  /* 찍은 증거: 1.7초 읽게 두었다가 → 들어 올려 곡선을 그리며 폴더 속으로 */
  useEffect(() => {
    if (!snap) return
    const t = window.setTimeout(() => {
      const card = snapRef.current, fo = folderRef.current, ph = phoneRef.current
      if (!card || !fo || !ph) return
      const p = ph.getBoundingClientRect(), f = fo.getBoundingClientRect()
      const x0 = p.left + p.width / 2, y0 = p.top + p.height * 0.45
      const dx = f.left + f.height * 0.55 - x0, dy = f.top + f.height * 0.5 - y0
      card.style.animation = 'none'
      const fly = card.animate(
        [
          { transform: 'translate(-50%,-50%) rotate(-3deg) scale(1)', opacity: 1 },
          { transform: 'translate(-50%,calc(-50% - 36px)) rotate(0deg) scale(.92)', opacity: 1, offset: 0.22 },
          { transform: `translate(calc(-50% + ${dx * 0.75}px),calc(-50% + ${dy * 0.55 - 30}px)) rotate(10deg) scale(.42)`, opacity: 1, offset: 0.62 },
          { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy - 22}px)) rotate(4deg) scale(.16)`, opacity: 1, offset: 0.86 },
          { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy + 4}px)) rotate(0deg) scale(.08)`, opacity: 0 },
        ],
        { duration: 1000, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' },
      )
      const open = window.setTimeout(() => setFolderOpen(true), 520)
      fly.onfinish = () => {
        window.clearTimeout(open)
        const next = [...found, snap.ev.id]
        setSnap(null)
        setFolderOpen(false)
        setFound(next)
        setLastFind(timeLeft)
        setHintOn(false)
        setBump((n) => n + 1)
        setPlus({ id: Date.now(), x: f.left + f.height * 0.55, y: f.top - 6 })
        busy.current = false
        if (next.length === EVIDENCE.length) window.setTimeout(() => setDone(true), 450)
      }
    }, 1700)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap])

  const openFolder = () => {
    if (busy.current || ended.current) return
    if (full) {
      setDone(false)
      setBoard(true)
    } else setEvBox(true)
  }

  const flags: RedFlag[] = EVIDENCE.map((e) => ({ target: e.id, match: '', label: e.label, explain: e.why }))

  /* 휴대폰 위 '지금 할 일' — 1 잠금 해제 → 2 증거 찾기 → 3 폴더 열어 재구성 */
  const phase = cur === 'lock' ? 1 : full ? 3 : 2
  const guide = phase === 1 ? fx.guide.lock : phase === 3 ? fx.guide.full : fx.guide.search

  return (
    <div className="fx">
      <div className="fx-bg" />

      <header className="hud">
        <div className="who">
          <span className="tag">
            <MagnifierIcon />
            {fx.hud.tag}
            <span className="tagsub"> · {fx.hud.tagSub}</span>
          </span>
        </div>
        <div className={`timer ${timeLeft <= 30 ? 'low' : ''}`}>
          <small>{fx.hud.time}</small>
          <b>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</b>
          <span className="bar"><i style={{ width: `${(timeLeft / TIME_LIMIT) * 100}%` }} /></span>
        </div>
        <div className="chance">
          <small>{fx.hud.chances}</small>
          <div className="dots">
            {Array.from({ length: CHANCES }, (_, i) => (
              <i key={i} className={i < chances ? '' : 'off'} />
            ))}
          </div>
        </div>
      </header>

      {/* 지금 할 일 — 연구실(메일) 화면처럼 크게, 단계가 바뀔 때마다 튀어나오며 */}
      <div key={phase} className="guide">
        <span className="pill headline-pop">{fill(fx.guide.step, { n: phase })}</span>
        <h2 className="headline-pop headline-glow">
          <Strong text={fill(guide.title, { n: EVIDENCE.length })} />
        </h2>
        <p>{guide.sub}</p>
      </div>

      {/* 피해자 휴대폰 — 아이폰 모양(검은 테두리·다이내믹 아일랜드·상태 표시줄·홈 바) */}
      <div className="phonewrap">
        <div ref={shellRef} className="shell">
          <section ref={phoneRef} className={`phone ${cur === 'lock' || cur === 'home' ? 'wall' : ''}`}>
            <div className="island" />
            <div className="status">
              <span className="st-time">{cur === 'lock' ? '' : fx.lock.clock}</span>
              <StatusIcons />
            </div>
            <div className="scr">
              {cur === 'lock' ? (
                <Lock onOpen={() => go('home')} />
              ) : cur === 'home' ? (
                <Home seen={seenApps} found={found} hint={hint} onGo={go} onDecoy={() => showToast(fx.toast.decoyTitle, fx.toast.decoyBody)} />
              ) : (
                <AppView screen={SCREENS[cur]} found={found} hint={hint} onGo={go} onInspect={inspect} />
              )}
            </div>
            {cur !== 'lock' && cur !== 'home' && (
              <div className="navbar">
                <button type="button" data-role="nav-back" onClick={back}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {fx.nav.back}
                </button>
                <button type="button" data-role="nav-home" onClick={home}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="5" y="5" width="14" height="14" rx="3" /></svg>
                  {fx.nav.home}
                </button>
              </div>
            )}
            <div className="homebar" />
            {toast && (
              <div key={toast.id} className="toast">
                <InfoIcon />
                <div>
                  <b>{toast.title}</b> {toast.body}
                </div>
              </div>
            )}
            <div ref={flashRef} className="flash" />
          </section>
        </div>
      </div>

      {/* 힌트 버튼 · 증거 폴더 */}
      <div className={`dock ${done ? 'top' : ''}`}>
        {!full && (
          <button
            type="button"
            data-role="hint"
            className={`hintbtn ${nudge ? 'nudge' : ''} ${hintOn ? 'on' : ''}`}
            onClick={() => {
              if (rules || cur === 'lock' || !nextEv || busy.current) return
              setHintOn(true)
              showToast(fx.hint.title, nextEv.hint, 4500)
            }}
          >
            <BulbIcon />
            <span>
              <b>{fx.hint.button}</b>
              {nudge && <small>{fx.hint.nudge}</small>}
            </span>
          </button>
        )}
        <button
          ref={folderRef}
          type="button"
          data-role="folder"
          className={`folder ${full ? 'full' : ''} ${folderOpen ? 'open' : ''}`}
          onClick={openFolder}
        >
          <FolderIcon />
          <span>
            <b>{fx.folder.name}</b>
            <small>{full ? fx.folder.full : fx.folder.idle}</small>
          </span>
          <span className="cnt">
            {found.length}/{EVIDENCE.length}
          </span>
        </button>
      </div>

      {snap && (
        <div ref={snapRef} key={snap.id} className="snap" style={snapPos(phoneRef.current)}>
          <div className="shot">{snap.text}</div>
          <b>
            <i>증거 {snap.no}</i>
            {snap.ev.label}
          </b>
          <small>{snap.ev.why}</small>
        </div>
      )}
      {plus && (
        <div key={plus.id} className="plus" style={{ left: plus.x, top: plus.y }} onAnimationEnd={() => setPlus(null)}>
          +1
        </div>
      )}

      {done && (
        <div className="done" data-role="evidence-done">
          <div className="card2">
            <div className="ttl">{fx.done.title}</div>
            <div className="four">
              {EVIDENCE.map((e, i) => (
                <span key={e.id} style={{ animationDelay: `${0.25 + i * 0.12}s` }}>
                  <CameraIcon />
                </span>
              ))}
            </div>
            <p>
              <Strong text={fill(fx.done.body, { n: EVIDENCE.length })} />
            </p>
            <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M12 4v15M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
      )}

      {/* 사건 브리핑 — 연구실(메일) 화면과 같은 짧은 3줄 + 기회 5개 */}
      {rules && (
        <div className="dim">
          <div className="box brief" role="dialog" aria-modal="true">
            <span className="gold-tag">
              <MagnifierIcon />
              {fx.rules.tag}
            </span>
            <h2>
              <Strong text={fill(fx.rules.title, { name: who })} />
            </h2>
            <ol className="steps">
              {fx.rules.steps.map((s, i) => (
                <li key={i}>
                  <span className="ico">{i === 0 ? <PhoneIcon /> : i === 1 ? <TargetIcon /> : <MagnifierIcon />}</span>
                  <span>
                    <Strong text={fill(s, { n: EVIDENCE.length, chances: CHANCES, min: TIME_LIMIT / 60 })} />
                  </span>
                </li>
              ))}
            </ol>
            <div className="chances" aria-hidden="true">
              {Array.from({ length: CHANCES }, (_, i) => (
                <i key={i} style={{ animationDelay: `${0.55 + i * 0.08}s` }} />
              ))}
            </div>
            <p className="note">{fx.rules.chanceNote}</p>
            <button type="button" className="cta" data-role="rules-start" onClick={() => setRules(false)}>
              {fx.rules.start}
            </button>
          </div>
        </div>
      )}

      {evBox && (
        <div className="dim">
          <div className="box">
            <span className="gold-tag">{fx.folder.name}</span>
            <h2>{fill(fx.folder.listTitle, { found: found.length, total: EVIDENCE.length })}</h2>
            <div className="evlist">
              {EVIDENCE.map((e) =>
                found.includes(e.id) ? (
                  <div key={e.id}>
                    {e.label}
                    <small>{e.why}</small>
                  </div>
                ) : (
                  <div key={e.id} className="empty">{fx.folder.empty}</div>
                ),
              )}
            </div>
            <button type="button" className="cta" onClick={() => setEvBox(false)}>
              {fx.folder.close}
            </button>
          </div>
        </div>
      )}

      {board && <Board onWrong={() => setWrongs((w) => w + 1)} onDone={() => toCard(EVIDENCE.length)} />}

      <AnimatePresence>
        {card && (
          <DefenseCard
            stats={{
              found: found.length,
              total: EVIDENCE.length,
              wrongs,
              misses,
              blocked: (found.includes('link') ? 1 : 0) + (found.includes('code') ? 1 : 0),
            }}
            flags={flags}
            solved={found}
            copy={timedOut ? { ...fx.card, failBody: fx.card.timeoutBody } : fx.card}
            onNext={() => onSolved(found.length)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function snapPos(ph: HTMLElement | null) {
  const p = ph?.getBoundingClientRect()
  return p ? { left: p.left + p.width / 2, top: p.top + p.height * 0.45 } : { left: '50%', top: '45%' }
}

/**
 * 잠금화면 — 아이폰 잠금화면 순서 그대로: 자물쇠 · 날짜 · 큰 시계 · 알림 묶음.
 * 알림 바로 아래에 큰 금색 [휴대폰 열어서 조사하기] — 예전엔 책상 그림 밑에 있어 못 찾는다는 피드백.
 * 알림을 눌러도 열립니다(아이폰에서 알림을 누르면 앱이 열리듯).
 */
function Lock({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="lock">
      <svg className="lockicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
        <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
        <path d="M8 10.5V7.5a4 4 0 018 0v3" strokeLinecap="round" />
      </svg>
      <div className="date">{fx.lock.date}</div>
      <div className="clock">{fx.lock.clock}</div>
      <div className="pushes">
        {fx.lock.pushes.map((p, i) => (
          <button key={p.title} type="button" className="push" style={{ animationDelay: `${0.15 + i * 0.12}s` }} onClick={onOpen}>
            <i>{p.icon}</i>
            <span className="tx">
              <span className="top">
                <b>{p.app}</b>
                <time>{p.time}</time>
              </span>
              <strong>{p.title}</strong>
              <small>{p.body}</small>
            </span>
          </button>
        ))}
      </div>
      <button type="button" className="open" data-role="unlock" onClick={onOpen}>
        {fx.lock.open}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <div className="quick" aria-hidden="true">
        <i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3h6l1 5-2 2v11H10V10L8 8z" strokeLinejoin="round" /></svg></i>
        <i><CameraIcon /></i>
      </div>
    </div>
  )
}

/**
 * 홈 화면 — 아이폰처럼 4열 격자 + 아래 고정 줄. 나머지 앱은 눌러도 '증거 없음' 안내만.
 * 증거가 아직 남아 있는 앱(메시지·카카오톡)은 팝업처럼 반짝이고 배지에 남은 증거 수가 뜹니다.
 * 그 앱의 증거를 다 찾으면 반짝임이 멈추고 배지도 사라져, 남은 쪽만 반짝입니다.
 */
function Home({ seen, found, hint, onGo, onDecoy }: { seen: string[]; found: string[]; hint: Evidence | null; onGo: (id: string) => void; onDecoy: () => void }) {
  const icon = (a: { id: string; name: string; icon: string; color: string; dark?: boolean; badge?: number }, real: boolean) => {
    const hasEv = EVIDENCE.some((e) => e.app === a.id)
    const left = EVIDENCE.filter((e) => e.app === a.id && !found.includes(e.id)).length
    const badge = hasEv ? left : a.badge
    return (
      <button
        key={a.id}
        type="button"
        data-app={real ? a.id : undefined}
        data-left={hasEv ? left : undefined}
        className={`icon ${real && seen.includes(a.id) ? 'seen' : ''} ${real && hint?.app === a.id ? 'hl' : ''} ${left > 0 ? 'live' : ''}`}
        onClick={() => (real ? onGo(a.id) : onDecoy())}
      >
        <span className="i" style={{ background: a.color, color: a.dark ? '#1c1c1e' : '#fff' }}>
          <AppIcon name={a.icon} />
          {badge ? <em>{badge}</em> : null}
        </span>
        {a.name}
      </button>
    )
  }
  return (
    <div className="home">
      <div className="grid">
        {fx.apps.map((a) => icon(a, true))}
        {fx.decoys.grid.map((a) => icon(a, false))}
      </div>
      <div className="tray">{fx.decoys.dock.map((a) => icon(a, false))}</div>
    </div>
  )
}

/** 상태 표시줄 오른쪽 — 신호 · 와이파이 · 배터리 */
function StatusIcons() {
  return (
    <span className="st-icons" aria-hidden="true">
      <svg viewBox="0 0 20 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="0.8" /><rect x="4.5" y="6" width="3" height="6" rx="0.8" /><rect x="9" y="3.5" width="3" height="8.5" rx="0.8" /><rect x="13.5" y="0.5" width="3" height="11.5" rx="0.8" /></svg>
      <svg viewBox="0 0 16 12" fill="currentColor"><path d="M8 11.2a1.6 1.6 0 110-3.2 1.6 1.6 0 010 3.2zm-3.4-4.4a4.8 4.8 0 016.8 0l-1.3 1.3a3 3 0 00-4.2 0zM1.9 4.1a8.6 8.6 0 0112.2 0l-1.3 1.3a6.8 6.8 0 00-9.6 0z" /></svg>
      <svg viewBox="0 0 27 12" fill="none" stroke="currentColor"><rect x="0.5" y="0.5" width="22" height="11" rx="3" opacity=".4" /><rect x="2" y="2" width="15" height="8" rx="1.6" fill="currentColor" stroke="none" /><path d="M24.5 4v4a2 2 0 000-4z" fill="currentColor" stroke="none" opacity=".4" /></svg>
    </span>
  )
}

/** 앱 화면 — 목록(누르면 이동) / 대화 · 줄(누르면 조사) */
function AppView({ screen, found, hint, onGo, onInspect }: { screen: Screen; found: string[]; hint: Evidence | null; onGo: (id: string) => void; onInspect: (l: Line) => void }) {
  let body: ReactNode
  if (screen.list) {
    body = screen.list.map((it) => (
      <button key={it.go} type="button" className={`li ${hint?.room === it.go ? 'hl' : ''}`} data-go={it.go} onClick={() => onGo(it.go)}>
        <span className="av" style={{ background: it.color }}>{it.av}</span>
        <span className="tx">
          <b>{it.name}</b>
          <span>{it.last}</span>
        </span>
        <time>{it.time}</time>
      </button>
    ))
  } else if (screen.thread) {
    body = (
      <div className={`thread ${screen.kakao ? 'k' : ''}`}>
        {screen.thread.map((m, i) =>
          m.day ? (
            <div key={i} className="day">{m.day}</div>
          ) : m.vid ? (
            <div key={i} className="vid"><i />{m.vid}</div>
          ) : (
            <button key={i} type="button" data-i={i} className={`bub ${m.me ? 'me' : ''} ${m.ev && found.includes(m.ev) ? 'found' : ''} ${hint && m.ev === hint.id ? 'hl' : ''}`} onClick={() => onInspect(m)}>
              <Linked text={m.t ?? ''} />
            </button>
          ),
        )}
      </div>
    )
  } else {
    body = (screen.rows ?? []).map((r, i) =>
      r.sec ? (
        <div key={i} className="sec">{r.sec}</div>
      ) : (
        <button key={i} type="button" data-i={i} className={`row ${r.red ? 'red' : ''}`} onClick={() => onInspect(r)}>
          {r.t}
          {r.small && <small>{r.small}</small>}
        </button>
      ),
    )
  }
  return (
    <>
      <div className="hdr">
        {screen.title}
        {screen.sub && <small>{screen.sub}</small>}
      </div>
      <div className="body">{body}</div>
    </>
  )
}

/** 증거 보드 — 일어난 순서대로 눌러 붉은 실로 잇기. 카드 자리는 매번 섞습니다. */
function Board({ onWrong, onDone }: { onWrong: () => void; onDone: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [spots] = useState(() => [...SPOTS].sort(() => Math.random() - 0.5))
  const [tilt] = useState(() => EVIDENCE.map(() => (Math.random() * 6 - 3).toFixed(1)))
  const [placed, setPlaced] = useState(0)
  const [bad, setBad] = useState<{ k: number; n: number } | null>(null)
  const [hint, setHint] = useState('')
  const [lines, setLines] = useState<Array<[number, number, number, number]>>([])
  const [closed, setClosed] = useState(false)

  const center = (id: string): [number, number] => {
    const b = wrapRef.current!.getBoundingClientRect()
    const r = wrapRef.current!.querySelector(`#${id}`)!.getBoundingClientRect()
    return [((r.left + r.width / 2 - b.left) / b.width) * 100, ((r.top + r.height / 2 - b.top) / b.height) * 100]
  }
  const link = (a: string, b: string) => {
    const [x1, y1] = center(a)
    const [x2, y2] = center(b)
    setLines((l) => [...l, [x1, y1, x2, y2]])
  }

  const pick = (k: number) => {
    if (k < placed || closed) return
    if (k !== placed) {
      onWrong()
      setBad({ k, n: Date.now() })
      setHint(placed === 0 ? fx.board.wrongFirst : fx.board.wrongNext)
      return
    }
    setHint('')
    if (k > 0) link(`fxev${k - 1}`, `fxev${k}`)
    const next = placed + 1
    setPlaced(next)
    if (next === EVIDENCE.length) {
      window.setTimeout(() => link(`fxev${k}`, 'fxdmg'), 700)
      window.setTimeout(() => setClosed(true), 1500)
    }
  }

  return (
    <div className="dim rebuild">
      <div className="box">
        <span className="gold-tag">{fx.board.tag}</span>
        <h2>{fx.board.title}</h2>
        <p className="lead">{fx.board.lead}</p>
        <div ref={wrapRef} className="boardwrap">
          <svg className="lines" viewBox="0 0 100 100" preserveAspectRatio="none">
            {lines.map(([x1, y1, x2, y2], i) => (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
            ))}
          </svg>
          {EVIDENCE.map((e, k) => (
            <button
              key={e.id + (bad?.k === k ? bad.n : '')}
              id={`fxev${k}`}
              type="button"
              data-role="board-card"
              data-k={k}
              className={`ev ${k < placed ? 'on' : ''} ${bad?.k === k ? 'bad' : ''}`}
              style={{ left: `${spots[k][0]}%`, top: `${spots[k][1]}%`, transform: `rotate(${tilt[k]}deg)` }}
              onClick={() => pick(k)}
            >
              <span className="no">{k < placed ? k + 1 : ''}</span>
              <b>{e.label}</b>
              <q>{e.quote}</q>
              {k < placed && <small>{e.when}</small>}
            </button>
          ))}
          <div id="fxdmg" className="ev dmg" style={{ left: '27.5%', top: '76%' }}>
            <b>{fx.board.damage}</b>
            <small>{fx.board.damageWhen}</small>
          </div>
        </div>
        <div className="hint">
          {closed ? (
            <div className="caught">
              {fx.board.caught}
              <small>{fx.board.suspect}</small>
            </div>
          ) : (
            hint
          )}
        </div>
        {closed && (
          <button type="button" className="cta" data-role="board-next" onClick={onDone}>
            {fx.board.next}
          </button>
        )}
      </div>
    </div>
  )
}

/** "**굵게**" 표시한 부분만 금색 */
function Strong({ text }: { text: string }) {
  return (
    <>
      {text.split('**').map((part, i) => (i % 2 ? <b key={i}>{part}</b> : <span key={i}>{part}</span>))}
    </>
  )
}

/** 대화 속 [주소] 를 링크 모양으로 */
function Linked({ text }: { text: string }) {
  return (
    <>
      {text.split(/\[([^\]\s]*\.[^\]\s]*)\]/).map((part, i) => (i % 2 ? <span key={i} className="url">{part}</span> : <span key={i}>{part}</span>))}
    </>
  )
}

/** 홈 화면 앱 아이콘 — 전부 SVG(이모지 금지) */
function AppIcon({ name }: { name: string }) {
  if (name === 'msg') return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16a1 1 0 011 1v10a1 1 0 01-1 1H10l-5 4v-4H4a1 1 0 01-1-1V6a1 1 0 011-1z" /></svg>
  if (name === 'talk') return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.5c5.2 0 9.4 3.3 9.4 7.4s-4.2 7.4-9.4 7.4c-.8 0-1.6-.1-2.3-.2L5 20.8l1.2-3.9C4 15.6 2.6 13.4 2.6 10.9c0-4.1 4.2-7.4 9.4-7.4z" /></svg>
  if (name === 'bank') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-5 9 5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" strokeLinejoin="round" /></svg>
  if (name === 'photo')
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
          <ellipse key={deg} cx="12" cy="7.2" rx="2.6" ry="4.6" transform={`rotate(${deg} 12 12)`} fill={['#f5b800', '#f58a1f', '#ef4444', '#c026d3', '#3b82f6', '#06b6d4', '#22c55e', '#84cc16'][i]} opacity=".85" />
        ))}
      </svg>
    )
  if (name === 'cal')
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="4" width="18" height="17" rx="3" fill="#fff" />
        <rect x="3" y="4" width="18" height="5" rx="2" fill="#ef4444" />
        <text x="12" y="18.5" fontSize="9" fontWeight="700" fill="#1c1c1e" textAnchor="middle" fontFamily="var(--font-sans)">18</text>
      </svg>
    )
  if (name === 'gear') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 01-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 01-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 012.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 012.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z" strokeLinejoin="round" /></svg>
  if (name === 'clock') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" fill="#fff" stroke="none" /><circle cx="12" cy="12" r="9" stroke="#e5e5ea" /><path d="M12 6.5V12l3.6 2.4" stroke="#1c1c1e" strokeWidth="1.6" strokeLinecap="round" /><path d="M12 12L8.2 9.8" stroke="#ff9500" strokeWidth="1.2" strokeLinecap="round" /></svg>
  if (name === 'weather') return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="9" cy="9" r="4" fill="#ffd60a" /><path d="M8 19h9.5a3.5 3.5 0 00.5-7 5 5 0 00-9.6-1A4 4 0 008 19z" fill="#fff" /></svg>
  if (name === 'phone') return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 3.4l2.3-.5a1 1 0 011.1.6l1.4 3.3a1 1 0 01-.3 1.2L9.6 9.2a11.5 11.5 0 005.2 5.2l1.2-1.5a1 1 0 011.2-.3l3.3 1.4a1 1 0 01.6 1.1l-.5 2.3a2 2 0 01-2 1.6A15.5 15.5 0 013.5 5.4a2 2 0 011.6-2z" /></svg>
  if (name === 'safari') return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="#1e90ff" /><circle cx="12" cy="12" r="8" fill="none" stroke="#fff" strokeWidth=".6" strokeDasharray="1 1.4" /><path d="M16.5 7.5L13.6 13.6 7.5 16.5l2.9-6.1z" fill="#fff" /><path d="M16.5 7.5l-2.9 6.1-3.2-1.5z" fill="#ff3b30" /></svg>
  if (name === 'camera') return <CameraIcon />
  if (name === 'music') return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 18.5a3 3 0 11-2-2.8V6.6l11-2.4v9.9a3 3 0 11-2-2.8V7.1l-7 1.5z" /></svg>
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></svg>
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M10 18.5h4" strokeLinecap="round" />
    </svg>
  )
}

function TargetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  )
}

function BulbIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0012 3z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MagnifierIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L21 21" strokeLinecap="round" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 8h3l1.6-2.2h6.8L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" strokeLinejoin="round" />
      <circle cx="12" cy="13.2" r="3.4" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.3v.2" strokeLinecap="round" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" overflow="visible">
      <path d="M4 12a3 3 0 013-3h11l4 4h19a3 3 0 013 3v21H4z" fill="#e9b21c" />
      <g className="paper">
        <rect x="10" y="14" width="28" height="20" rx="1.5" fill="#fff" />
        <rect x="13" y="18" width="16" height="2" rx="1" fill="#cbd5e1" />
        <rect x="13" y="22" width="20" height="2" rx="1" fill="#cbd5e1" />
      </g>
      <g className="ff">
        <path d="M4 18h40v19a3 3 0 01-3 3H7a3 3 0 01-3-3z" fill="#feca36" />
        <rect x="14" y="26" width="20" height="3" rx="1.5" fill="#1c2e63" opacity=".35" />
      </g>
    </svg>
  )
}
