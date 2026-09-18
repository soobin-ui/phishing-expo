import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EmailBody } from "../channels/MailView";
import { DefenseCard } from "../components/DefenseCard";
import { splitByFlags } from "../lib/highlight";
import { fill, ui } from "../lib/content";
import type { MailDoc, RedFlag, Scenario } from "../types";

/**
 * [메일] 연구실·산학협력 — **피싱 전문 수사관** 모드.
 *
 * 규칙 설명(받은편지함은 흐리게 뒤에 깔림) → 받은편지함 → 새로 온 메일을 열어 수상한 문구 4개를 조사 → 잡았다 카드.
 *
 * ★ 머리글에 '지금 할 일'을 크게 씁니다(STEP 1 메일 열기 → STEP 2 수상한 문구 4개 찾기).
 *   작게 쓰니 아무도 못 보고 "메일만 보고 뭘 해야 할지 모르겠다"는 피드백이 왔습니다(2026-09-18).
 *   남은 시간·찾은 문구·남은 기회도 같은 줄에 큰 숫자로.
 *
 * ★ 제한 시간 2분 — 수상한 메일을 여는 순간부터 잽니다.
 *   조사 말풍선(어떻게 조사할까요?)이 떠 있는 동안과 결과 카드에서는 멈춥니다.
 *   시간이 다 되면 그때까지 찾은 것으로 카드가 뜹니다(놓친 문구는 카드 뒷면에서 알려줌).
 *
 * ★ 돋보기(조사 기회)에 개수 제한이 있습니다.
 *   제한이 없으면 "전부 눌러보면 성공"하는 다 눌러보기 게임이 됩니다.
 *   맞든 틀리든 한 번 누를 때마다 하나씩 닳으므로, 눈으로 먼저 읽게 됩니다.
 *
 * ★ 수상한 곳을 찾으면 바로 옆에 말풍선이 떠서 '어떻게 조사할지' 고르게 합니다.
 *   찾는 것으로 끝내면 "빨간 줄 누르기"가 되고 실제로 뭘 해야 하는지는 안 남습니다.
 *   틀린 방법을 고르면 왜 안 되는지 알려주고 다시 고르게 합니다(벌점 없음).
 *
 * 다른 네 주제(문자·메신저·전화)는 직접 당해보는 방식입니다. 메일만 이 방식입니다.
 */
type View = "inbox" | "mail";
type Pop = {
  flag: RedFlag;
  x: number;
  y: number;
  below: boolean;
  wrong: number | null;
};

const PHISH = "__phish__";
/** 돋보기 개수 — 찾을 문구 4개 + 헛짚을 여유 2번 */
const TOOLS = 6;
/** 제한 시간(초) — 수상한 메일을 연 순간부터 */
const TIME_LIMIT = 120;

const mmss = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function MailScreen({
  scenario,
  onReply,
  onSolved,
}: {
  scenario: Scenario;
  /** 놓친 곳만큼 안전도를 깎습니다(마지막 등급에 반영) */
  onReply: (delta: number, gave: string | null) => void;
  onSolved: (foundCount: number) => void;
}) {
  const t = ui.investigate;
  const c = ui.channels.mail;
  const flags = scenario.redFlags;
  const total = flags.length;

  const [view, setView] = useState<View>("inbox");
  /** 처음엔 규칙 상자를 먼저 — 뒤의 받은편지함은 흐리게 보여서 '이제 저걸 조사하는구나'를 미리 봅니다 */
  const [rules, setRules] = useState(true);
  const [solved, setSolved] = useState<string[]>([]);
  const [used, setUsed] = useState(0);
  const [pop, setPop] = useState<Pop | null>(null);
  const [miss, setMiss] = useState(false);
  const [misses, setMisses] = useState(0);
  const [wrongs, setWrongs] = useState(0);
  const [toast, setToast] = useState("");
  const [card, setCard] = useState(false);
  /** 돋보기를 쓴 자리에서 잠깐 떠오르는 '남은 개수' */
  const [popCount, setPopCount] = useState<{
    id: number;
    x: number;
    y: number;
    n: number;
  } | null>(null);
  const paneRef = useRef<HTMLElement>(null);
  const done = useRef(false);

  /** 제한 시간 — 수상한 메일을 열면 시작, 말풍선·카드 동안은 멈춤 */
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [timedOut, setTimedOut] = useState(false);
  const low = timeLeft <= 30;
  const running = started && !card && !pop && !timedOut;

  const left = TOOLS - used;
  const decoys = scenario.inbox ?? [];
  const mails: Array<{ id: string; doc: MailDoc; phish: boolean }> = [
    { id: PHISH, doc: scenario, phish: true },
    ...decoys.map((d, i) => ({ id: d.id ?? `d${i}`, doc: d, phish: false })),
  ];

  const showToast = (msg: string, ms = 1800) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), ms);
  };

  /** 조사 끝 — 다 잡았거나, 돋보기가 떨어졌거나, 시간이 다 됐거나 */
  const finish = (foundCount: number) => {
    if (done.current) return;
    done.current = true;
    onReply(-15 * (total - foundCount), null);
    setCard(true);
  };

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(
      () => setTimeLeft((v) => Math.max(0, v - 1)),
      1000,
    );
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (timeLeft > 0 || !started || done.current) return;
    setTimedOut(true);
    showToast(t.timeoutToast, 1300);
    window.setTimeout(() => finish(solved.length), 1200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  /** 돋보기 한 개 쓰기 — 누른 자리에 남은 개수를 띄웁니다 */
  const spend = (e?: { clientX: number; clientY: number }): number => {
    const next = used + 1;
    setUsed(next);
    const remain = TOOLS - next;
    const pane = paneRef.current?.getBoundingClientRect();
    if (e && pane) {
      setPopCount({
        id: Date.now(),
        x: e.clientX - pane.left,
        y: e.clientY - pane.top,
        n: remain,
      });
      window.setTimeout(() => setPopCount(null), 1400);
    }
    return remain;
  };

  /** 수상한 곳을 눌렀을 때 — 그 자리 옆에 말풍선 */
  const tapFlag = (
    flag: RedFlag,
    el: HTMLElement,
    at?: { clientX: number; clientY: number },
  ) => {
    if (pop || card || timedOut || solved.includes(flag.target)) return;
    const pane = paneRef.current?.getBoundingClientRect();
    if (!pane) return;
    const r = el.getBoundingClientRect();
    spend(at ?? { clientX: r.left + r.width / 2, clientY: r.top });
    const bottom = r.bottom - pane.top;
    const below = bottom + 240 < pane.height;
    setPop({
      flag,
      x: r.left - pane.left,
      y: below ? bottom + 8 : r.top - pane.top - 8,
      below,
      wrong: null,
    });
  };

  /** 수상하지 않은 곳을 눌렀을 때 — 돋보기만 닳습니다 */
  const tapMiss = (at?: { clientX: number; clientY: number }) => {
    if (pop || card || timedOut) return;
    const remain = spend(at);
    setMisses((m) => m + 1);
    setMiss(true);
    window.setTimeout(() => setMiss(false), 700);
    showToast(remain === 1 ? t.lastOne : t.miss);
    if (remain <= 0) window.setTimeout(() => finish(solved.length), 700);
  };

  /** 말풍선에서 조사 방법을 골랐을 때 */
  const choose = (i: number) => {
    if (!pop?.flag.probe) return;
    if (!pop.flag.probe.options[i].ok) {
      setWrongs((w) => w + 1);
      setPop({ ...pop, wrong: i });
      return;
    }
    const next = [...solved, pop.flag.target];
    setSolved(next);
    setPop(null);
    if (next.length >= total || left <= 0)
      window.setTimeout(() => finish(next.length), 500);
  };

  /** 메일 글자를 '누를 수 있는 조각'으로 */
  const render = (text: string) =>
    splitByFlags(text, flags).map((seg, i) =>
      seg.flag ? (
        <span
          key={i}
          onClick={(e) => tapFlag(seg.flag!, e.currentTarget, e)}
          // ★ 찾기 전에는 여백을 주지 않습니다 — 틈이 생기면 "있음 을"처럼 보이고 자리가 새어 나갑니다
          className={`cursor-pointer rounded ${
            solved.includes(seg.flag.target)
              ? "bg-red-100 px-0.5 font-bold text-red-700 underline decoration-red-400 decoration-2"
              : ""
          }`}
        >
          {seg.text}
        </span>
      ) : (
        <span key={i} onClick={(e) => tapMiss(e)}>
          {seg.text}
        </span>
      ),
    );

  const flagOf = (target: string) => flags.find((f) => f.target === target);
  const linkFlag = flagOf("link");
  const fileFlag = flagOf("attachment");

  /* ── 받은편지함 / 메일 조사 ── */
  return (
    <div className="relative h-full w-full">
      <div
        aria-hidden={rules}
        className={`flex h-full w-full flex-col transition-[filter] duration-500 ${
          rules ? "pointer-events-none blur-[6px] select-none" : ""
        }`}
      >
        <header className="shrink-0 px-4 pt-[max(0.7rem,1.4vh)] pb-2.5">
          <div className="mx-auto w-full max-w-[78rem]">
            {/* 지금 할 일 — 크게, 튀어나오며. 받은편지함에서는 '메일 열기', 메일 안에서는 '수상한 문구 찾기' */}
            <p className="font-display text-[0.8rem] font-bold tracking-[0.16em] text-[#6f93c4] tabular-nums">
              {fill(t.step, { n: view === "inbox" ? 1 : 2 })}
            </p>
            <h2
              key={view}
              className="headline-pop mt-1 origin-left font-display text-[clamp(1.45rem,5.4vw,2.35rem)] leading-tight font-bold text-white [text-shadow:0_0_1.2rem_rgba(47,168,255,0.65)]"
            >
              <Strong
                text={view === "inbox" ? t.openGoal : fill(t.goal, { n: total })}
                pulse={view === "mail"}
              />
            </h2>
            <p className="mt-1 text-[1rem] leading-snug text-white/65">
              {view === "inbox" ? t.openSub : t.goalSub}
            </p>

            {/* 세로 화면(세로 태블릿·휴대폰): 숫자 상자를 제목 아래 한 줄로 */}
            <div className="mt-2.5 flex items-stretch gap-2 wide:hidden">
              {renderStats(false)}
            </div>
          </div>
        </header>

        <div className="mx-auto flex min-h-0 w-full max-w-[78rem] flex-1 wide:gap-4 wide:px-4 wide:pb-4">
        <motion.section
          ref={paneRef}
          animate={miss ? { x: [0, -7, 7, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.45 }}
          className={`relative min-h-0 w-full min-w-0 flex-1 overflow-hidden rounded-t-2xl bg-white wide:rounded-2xl ${
            view === "mail" && !card ? "cursor-magnify" : ""
          }`}
        >
          {view === "inbox" ? (
            <Inbox
              mails={mails}
              title={c.inbox}
              hint={c.arrive.openHint}
              onOpen={(id) => {
                if (id !== PHISH) return showToast(t.openDecoy);
                setView("mail");
                setStarted(true); // 여기서부터 2분
              }}
            />
          ) : (
            <div className="flex h-full min-h-0 flex-col text-[#1f2430]">
              <div className="flex shrink-0 items-center gap-4 border-b border-[#eceff4] px-4 py-3 text-[0.95rem] text-[#5f6b80]">
                <button
                  type="button"
                  data-role="to-inbox"
                  onClick={() => setView("inbox")}
                  className="rounded-lg px-1 py-1 active:bg-[#f1f4f9]"
                >
                  ‹ {c.inbox}
                </button>
              </div>
              <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <div className="mx-auto w-full max-w-[50rem] px-4 py-4">
                  <EmailBody
                    mail={scenario}
                    render={render}
                    onLink={(el, e) => linkFlag && tapFlag(linkFlag, el, e)}
                    onAttachment={(el, e) =>
                      fileFlag && tapFlag(fileFlag, el, e)
                    }
                    solvedLink={!!linkFlag && solved.includes(linkFlag.target)}
                    solvedFile={!!fileFlag && solved.includes(fileFlag.target)}
                  />
                </div>
              </div>
            </div>
          )}

          <AnimatePresence>
            {pop && (
              <Bubble
                pop={pop}
                onPick={choose}
                onRetry={() => setPop({ ...pop, wrong: null })}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {card && (
              <DefenseCard
                stats={{
                  found: solved.length,
                  total,
                  wrongs,
                  misses,
                  blocked:
                    (linkFlag && solved.includes(linkFlag.target) ? 1 : 0) +
                    (fileFlag && solved.includes(fileFlag.target) ? 1 : 0),
                }}
                flags={flags}
                solved={solved}
                copy={timedOut ? { failBody: t.timeout } : undefined}
                onNext={() => onSolved(solved.length)}
              />
            )}
          </AnimatePresence>

          {/* 누른 자리에서 크게 튀어나오는 '남은 돋보기 N개' */}
          {popCount && (
            <span
              key={popCount.id}
              className="tool-pop pointer-events-none absolute z-40 flex items-center gap-2 rounded-2xl border-2 border-gold bg-navy-deep px-4 py-2 font-display text-[1.35rem] font-bold whitespace-nowrap text-white shadow-[0_0.5rem_1.6rem_rgba(0,0,0,0.4),0_0_1.2rem_rgba(254,202,54,0.45)]"
              style={{ left: popCount.x, top: popCount.y }}
            >
              <Magnifier className="h-[1.3rem] w-[1.3rem] text-gold" />
              {fill(t.spent, { n: popCount.n })}
            </span>
          )}

          {toast && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-x-4 bottom-4 z-30 rounded-xl bg-[#1f2430] px-4 py-3 text-center text-[0.95rem] text-white shadow-lg"
            >
              {toast}
            </motion.p>
          )}
        </motion.section>

        {/* 가로 화면(노트북·가로 태블릿): 남은 시간을 메일 오른쪽에 크게 */}
        <aside className="hidden w-[13.5rem] shrink-0 flex-col gap-3 wide:flex">
          {renderStats(true)}
        </aside>
        </div>
      </div>

      <AnimatePresence>
        {rules && <Rules total={total} onStart={() => setRules(false)} />}
      </AnimatePresence>
    </div>
  );

  /** 남은 시간 · 찾은 문구 · 남은 기회 — 세로 화면은 한 줄, 가로 화면은 메일 오른쪽 세로로 크게 */
  function renderStats(big: boolean) {
    const urgent = low && started;
    const digits = big ? "text-[3.4rem]" : "text-[1.9rem]";
    const small = big ? "text-[1.3rem]" : "text-[1rem]";
    return (
      <>
        <Stat label={t.time} low={urgent} big={big}>
          <b
            data-role="timer"
            className={`mt-0.5 font-display ${digits} leading-none font-bold tabular-nums ${
              urgent ? "timer-shake text-[#ff8080]" : "text-white"
            }`}
          >
            {mmss(timeLeft)}
          </b>
          <span className={`w-full overflow-hidden rounded-full bg-white/12 ${big ? "mt-3 h-[0.45rem]" : "mt-1.5 h-[0.3rem]"}`}>
            <span
              className={`block h-full rounded-full transition-[width] duration-1000 ease-linear ${
                urgent ? "bg-[#ff8080]" : "bg-gold"
              }`}
              style={{ width: `${(timeLeft / TIME_LIMIT) * 100}%` }}
            />
          </span>
        </Stat>

        <Stat label={t.progressLabel} big={big}>
          <motion.b
            key={solved.length}
            initial={{ scale: solved.length ? 1.6 : 1 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 12 }}
            data-role="found-count"
            className={`mt-0.5 font-display ${digits} leading-none font-bold text-gold tabular-nums`}
          >
            {solved.length}
            <span className={`${small} font-bold text-white/50`}> / {total}</span>
          </motion.b>
          <span className={`flex ${big ? "mt-3 gap-1.5" : "mt-2 gap-1"}`} aria-hidden="true">
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={`rounded-full ${big ? "h-[0.7rem] w-[0.7rem]" : "h-[0.5rem] w-[0.5rem]"} ${
                  i < solved.length ? "bg-gold" : "bg-white/20"
                }`}
              />
            ))}
          </span>
        </Stat>

        <Stat label={t.chances} big={big}>
          <motion.b
            key={left}
            initial={{ scale: left < TOOLS ? 1.6 : 1 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 12 }}
            className={`mt-0.5 font-display ${digits} leading-none font-bold tabular-nums ${
              left <= 1 ? "text-[#ff8080]" : "text-white"
            }`}
          >
            {left}
            <span className={`${small} font-bold text-white/50`}> / {TOOLS}</span>
          </motion.b>
          <span
            className={`flex ${big ? "mt-3 gap-1" : "mt-1.5 gap-[0.15rem]"}`}
            aria-label={fill(t.left, { n: left })}
          >
            {Array.from({ length: TOOLS }, (_, i) => (
              <Magnifier
                key={i}
                className={`${big ? "h-[1.25rem] w-[1.25rem]" : "h-[0.95rem] w-[0.95rem]"} ${i < left ? "text-gold" : "text-white/15"}`}
              />
            ))}
          </span>
        </Stat>
      </>
    );
  }
}

/**
 * 규칙 상자 — 받은편지함 위에 먼저 뜹니다.
 * 무엇을(수상한 곳 N군데) · 몇 번 안에(돋보기 6개) 를 조사 전에 알고 시작하게.
 */
function Rules({ total, onStart }: { total: number; onStart: () => void }) {
  const r = ui.investigate.rules;
  const icons = [
    <RuleMail key="m" />,
    <RuleTarget key="t" />,
    <Magnifier key="g" className="h-[1.25rem] w-[1.25rem]" />,
  ];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-[#050a18]/55 px-5"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-title"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        className="w-full max-w-[30rem] rounded-2xl border border-[#2fa8ff]/60 bg-[#0b1631]/95 px-[clamp(1.2rem,4vw,1.8rem)] py-[clamp(1.2rem,3vh,1.8rem)] text-center text-white shadow-[0_0_2.4rem_rgba(47,168,255,0.35),inset_0_0_1.6rem_rgba(47,168,255,0.08)]"
      >
        <span className="inline-flex items-center gap-1.5 rounded-md bg-gold px-2.5 py-1 font-display text-[0.85rem] leading-none font-bold text-navy-deep">
          <RuleMail className="h-[0.95rem] w-[0.95rem]" />
          {r.tag}
        </span>
        <h2
          id="rules-title"
          className="mt-3 font-display text-[min(1.6rem,6vw)] leading-snug font-bold [text-shadow:0_0_1rem_rgba(47,168,255,0.6)]"
        >
          {r.title}
        </h2>

        <ol className="mt-5 flex flex-col gap-2.5 text-left">
          {r.steps.map((step, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-3"
            >
              <span className="flex h-[2.3rem] w-[2.3rem] shrink-0 items-center justify-center rounded-lg border border-[#2fa8ff]/50 bg-[#050a18] text-[#9fe0ff]">
                {icons[i]}
              </span>
              <span className="min-w-0 flex-1 text-[1.08rem] leading-snug text-white/85">
                <Strong
                  text={fill(step, { n: total, tools: TOOLS, min: TIME_LIMIT / 60 })}
                />
              </span>
            </li>
          ))}
        </ol>

        {/* 돋보기 6개 — 기회가 눈에 보이게 */}
        <div className="mt-4 flex justify-center gap-1.5" aria-hidden="true">
          {Array.from({ length: TOOLS }, (_, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: 0.55 + i * 0.08,
                type: "spring",
                stiffness: 380,
                damping: 16,
              }}
            >
              <Magnifier className="h-[1.6rem] w-[1.6rem] text-gold" />
            </motion.span>
          ))}
        </div>
        <p className="mt-2 text-[0.9rem] text-white/55">{r.toolNote}</p>

        <button
          type="button"
          data-role="rules-start"
          onClick={onStart}
          className="mt-5 min-h-[3.8rem] w-full rounded-xl bg-gold px-4 font-display text-[1.25rem] font-bold text-navy-deep shadow-[0_0.3rem_0_var(--color-gold-deep)] active:translate-y-[0.15rem] active:shadow-[0_0.15rem_0_var(--color-gold-deep)]"
        >
          {r.start}
        </button>
      </motion.div>
    </motion.div>
  );
}

/** 머리글의 숫자 상자 한 칸 — 남은 시간 / 찾은 문구 / 남은 기회. 시간이 얼마 안 남으면 붉게 */
function Stat({
  label,
  low = false,
  big = false,
  children,
}: {
  label: string;
  low?: boolean;
  /** 가로 화면 오른쪽 세로 상자 — 여백·글자 크게 */
  big?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl border transition-colors ${
        big ? "px-3 py-4" : "px-2 py-1.5"
      } ${
        low
          ? "border-red-400/70 bg-red-500/15 shadow-[0_0_1.4rem_rgba(255,128,128,0.35)]"
          : "border-[#2fa8ff]/40 bg-[#0b1631]/85"
      }`}
    >
      <span className={`font-semibold tracking-wide text-white/55 ${big ? "text-[0.95rem]" : "text-[0.72rem]"}`}>
        {label}
      </span>
      {children}
    </div>
  );
}

/** **굵게** 표시한 부분만 금색으로 — pulse 면 그 부분이 천천히 커졌다 작아집니다(찾을 개수 강조) */
function Strong({ text, pulse = false }: { text: string; pulse?: boolean }) {
  return (
    <>
      {text.split("**").map((part, i) =>
        i % 2 ? (
          <b
            key={i}
            className={`font-bold whitespace-nowrap text-gold ${pulse ? "gold-pulse text-[1.2em]" : ""}`}
          >
            {part}
          </b>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function RuleMail({
  className = "h-[1.25rem] w-[1.25rem]",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3.5 7l8.5 6 8.5-6" strokeLinejoin="round" />
    </svg>
  );
}

function RuleTarget() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[1.25rem] w-[1.25rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </svg>
  );
}

/** 어떻게 조사할까요? — 찾은 자리 바로 옆 말풍선 */
function Bubble({
  pop,
  onPick,
  onRetry,
}: {
  pop: Pop;
  onPick: (i: number) => void;
  onRetry: () => void;
}) {
  const t = ui.investigate;
  const probe = pop.flag.probe;
  if (!probe) return null;
  const wrong = pop.wrong === null ? null : probe.options[pop.wrong];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      data-role="probe"
      className="absolute z-40 w-[min(23rem,calc(100%-1.5rem))]"
      style={{
        left: `clamp(0.75rem, ${pop.x}px, calc(100% - min(23rem, 100% - 1.5rem) - 0.75rem))`,
        top: pop.below ? pop.y : undefined,
        bottom: pop.below ? undefined : `calc(100% - ${pop.y}px)`,
      }}
    >
      <div className="rounded-2xl bg-navy-deep p-4 text-white shadow-[0_0.8rem_2rem_rgba(0,0,0,0.35)]">
        <p className="flex items-start gap-2 text-[1.02rem] leading-snug font-bold">
          <span className="mt-0.5 shrink-0 rounded-md bg-gold px-1.5 py-0.5 text-[0.7rem] font-extrabold text-navy-deep">
            발견
          </span>
          {pop.flag.label}
        </p>

        {wrong ? (
          <>
            <p className="mt-3 text-[0.95rem] font-bold text-[#fca5a5]">
              {t.wrong}
            </p>
            <p className="mt-1.5 text-[0.98rem] leading-relaxed text-white/80">
              {wrong.why}
            </p>
            <button
              type="button"
              data-role="probe-retry"
              onClick={onRetry}
              className="mt-3 w-full rounded-xl bg-white/12 px-4 py-2.5 text-[0.98rem] font-bold text-white active:bg-white/20"
            >
              {t.retry}
            </button>
          </>
        ) : (
          <>
            <p className="mt-2.5 text-[0.92rem] font-semibold text-sky">
              {probe.question}
            </p>
            <div className="mt-2 flex flex-col gap-1.5">
              {probe.options.map((o, i) => (
                <button
                  key={i}
                  type="button"
                  data-role={o.ok ? "probe-ok" : "probe-no"}
                  onClick={() => onPick(i)}
                  className="rounded-xl bg-white/10 px-3.5 py-2.5 text-left text-[0.98rem] leading-snug font-semibold text-white active:bg-white/20"
                >
                  {o.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

/** 받은편지함 목록 */
function Inbox({
  mails,
  title,
  hint,
  onOpen,
}: {
  mails: Array<{ id: string; doc: MailDoc; phish: boolean }>;
  title: string;
  hint: string;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col text-[#1f2430]">
      <div className="flex shrink-0 items-center gap-2 border-b border-[#eceff4] px-5 py-3.5">
        <span className="font-display text-[1.2rem] font-bold text-navy">
          {title}
        </span>
        <span className="rounded-full bg-[#2f6be0] px-2 py-0.5 text-[0.78rem] font-bold text-white">
          1
        </span>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[44rem]">
          {mails.map((m) => (
            <motion.button
              key={m.id}
              type="button"
              data-role={m.phish ? "open-phish" : "open-decoy"}
              onClick={() => onOpen(m.id)}
              animate={
                m.phish
                  ? {
                      scale: [1, 1.012, 1],
                      backgroundColor: [
                        "rgba(47,107,224,0)",
                        "rgba(47,107,224,0.07)",
                        "rgba(47,107,224,0)",
                      ],
                    }
                  : undefined
              }
              transition={{
                duration: 3.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className={`flex w-full items-start gap-3 border-b border-[#f2f4f8] px-5 py-4 text-left active:bg-[#eef4ff] ${
                m.phish ? "" : "opacity-55"
              }`}
            >
              <span
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                  m.phish ? "bg-[#2f6be0]" : "bg-transparent"
                }`}
              />
              <span className="flex h-[2.4rem] w-[2.4rem] shrink-0 items-center justify-center rounded-full bg-[#e9edf3] text-[0.9rem] font-bold text-[#5f6b80]">
                {m.doc.sender.name.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex justify-between text-[1rem]">
                  <span
                    className={`truncate ${m.phish ? "font-bold text-[#1f2430]" : "text-[#6b7280]"}`}
                  >
                    {m.doc.sender.name}
                  </span>
                  <span className="shrink-0 pl-2 text-[0.82rem] text-[#9aa1ad]">
                    {m.doc.time}
                  </span>
                </span>
                <span
                  className={`block truncate text-[1.02rem] ${m.phish ? "font-semibold" : "text-[#8a93a5]"}`}
                >
                  {m.doc.subject}
                </span>
                <span className="mt-0.5 block truncate text-[0.92rem] text-[#9aa1ad]">
                  {(m.doc.body ?? "").split("\n")[0]}
                </span>
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      <p className="shrink-0 border-t border-[#eceff4] bg-[#f7f9fc] px-4 py-3 text-center text-[0.95rem] font-semibold text-[#2f6be0]">
        {hint}
      </p>
    </div>
  );
}

function Magnifier({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden="true"
    >
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L21 21" strokeLinecap="round" />
    </svg>
  );
}
