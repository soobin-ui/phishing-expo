import { CallView } from './CallView'
import { MailView } from './MailView'
import { MessengerView } from './MessengerView'
import { SmsView } from './SmsView'
import type { ChannelProps } from './shared'

export type { ChannelProps, Compose, Item } from './shared'

/** 주제마다 정해진 받는 화면을 띄웁니다 (scenarios.json 의 channel). */
export function ChannelView(props: ChannelProps) {
  switch (props.scenario.channel) {
    case 'mail':
      return <MailView {...props} />
    case 'messenger':
      return <MessengerView {...props} />
    case 'call':
      return <CallView {...props} />
    default:
      return <SmsView {...props} />
  }
}

/** 전화는 어두운 화면 — 찾기 화면에서 수상한 곳 표시 색을 고를 때 씁니다 */
export const isDarkChannel = (channel: string) => channel === 'call'
