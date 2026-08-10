import replyJson from '../content/reply.json'

export const reply = replyJson

export interface ReplyJudgement {
  delta: number
  label: string
  kind: 'digits' | 'risky' | 'safe' | 'neutral'
}

/**
 * 관람객이 직접 쓴 답장을 채점합니다.
 *
 * ★ 입력한 글은 어디에도 저장하지 않습니다.
 *   화면에 말풍선으로 잠깐 떠 있다가 체험이 끝나면 사라집니다.
 *   통계에도 점수만 남고 글자는 남기지 않습니다.
 *
 * 규칙은 src/content/reply.json 에서 고칠 수 있습니다.
 */
export function judgeReply(text: string): ReplyJudgement {
  const t = text.trim()

  // 1. 숫자를 길게 적었으면 가장 위험합니다(계좌번호·주민번호·인증번호).
  const digits = t.replace(/\D/g, '')
  if (digits.length >= reply.digitsRule.minDigits) {
    return { delta: reply.digitsRule.delta, label: reply.digitsRule.label, kind: 'digits' }
  }

  // 2. 멈추고 확인하는 말이 있으면 안전합니다.
  //    (위험 단어보다 먼저 봅니다 — "계좌는 안 알려줘요" 같은 답을 위험으로 보면 안 됩니다)
  if (reply.safe.words.some((w) => t.includes(w))) {
    return { delta: reply.safe.delta, label: reply.safe.label, kind: 'safe' }
  }

  // 3. 요구를 들어주는 말이 있으면 위험합니다.
  if (reply.risky.words.some((w) => t.includes(w))) {
    return { delta: reply.risky.delta, label: reply.risky.label, kind: 'risky' }
  }

  // 4. 그밖에 — 그냥 대화를 이어간 경우
  return { delta: reply.neutral.delta, label: reply.neutral.label, kind: 'neutral' }
}
