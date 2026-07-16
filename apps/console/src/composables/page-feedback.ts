import { useLoadingBar, useMessage, useNotification } from 'naive-ui'

/** 页面级反馈三件套:加载条、轻提示、统一格式的错误通知。 */
export function usePageFeedback() {
  const loadingBar = useLoadingBar()
  const message = useMessage()
  const notification = useNotification()

  function notifyError(title: string, reason: unknown, fallback: string) {
    notification.error({
      content: reason instanceof Error ? reason.message : fallback,
      duration: 4500,
      title,
    })
  }

  return { loadingBar, message, notifyError }
}
