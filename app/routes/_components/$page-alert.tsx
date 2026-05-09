import { useEffect, useState } from 'hono/jsx'

export interface PageAlertState {
  closable?: boolean
  message: string
  type: 'error' | 'success'
}

interface Props {
  alert?: PageAlertState
  closable?: boolean
}

const pageAlertDelayMs = 3600

export default function PageAlert({ alert, closable = true }: Props) {
  const [visible, setVisible] = useState(true)
  const isClosable = alert ? alert.closable ?? closable : false

  useEffect(() => {
    setVisible(true)
  }, [alert?.message, alert?.type])

  useEffect(() => {
    if (!alert) {
      return
    }

    clearConsumedAlertQuery()

    if (!isClosable) {
      return
    }

    const timer = window.setTimeout(() => {
      setVisible(false)
    }, pageAlertDelayMs)

    return () => window.clearTimeout(timer)
  }, [alert?.message, alert?.type, isClosable])

  if (!alert || !visible) {
    return null
  }

  return (
    <div class="toast toast-top toast-end z-50 pointer-events-none">
      <div
        class={`alert pointer-events-auto max-w-sm shadow-lg ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`}
        role="alert"
      >
        <i
          class={
            alert.type === 'success'
              ? 'icon-[ri--checkbox-circle-line]'
              : 'icon-[ri--error-warning-line]'
          }
        />
        <span>{alert.message}</span>
        {isClosable
          ? (
              <button
                class="btn btn-ghost btn-circle btn-xs"
                type="button"
                aria-label="关闭提示"
                onClick={() => setVisible(false)}
              >
                <i class="icon-[ri--close-line]" />
              </button>
            )
          : null}
      </div>
    </div>
  )
}

function clearConsumedAlertQuery() {
  if (typeof window.history.replaceState !== 'function') {
    return
  }

  const url = new URL(window.location.href)
  const hadAlertQuery = (
    url.searchParams.has('alert')
    || url.searchParams.has('message')
    || url.searchParams.has('closable')
  )

  if (!hadAlertQuery) {
    return
  }

  url.searchParams.delete('alert')
  url.searchParams.delete('message')
  url.searchParams.delete('closable')
  window.history.replaceState(window.history.state, '', url)
}
