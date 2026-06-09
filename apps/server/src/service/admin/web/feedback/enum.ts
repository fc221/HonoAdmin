export const webFeedbackStatuses = ['open', 'close'] as const

export type WebFeedbackStatus = (typeof webFeedbackStatuses)[number]

export const webFeedbackStatusOptions: Array<{
  label: string
  value: WebFeedbackStatus
}> = [
  { label: '待处理', value: 'open' },
  { label: '已处理', value: 'close' },
]
