export interface PageAlertState {
  closable?: boolean
  message: string
  type: 'error' | 'success'
}

interface Props {
  alert?: PageAlertState
  closable?: boolean
}

export default function PageAlert({ alert, closable = true }: Props) {
  if (!alert) {
    return null
  }

  const isClosable = alert.closable ?? closable
  const closeControlId = `page-alert-close-${alert.type}-${hashAlertMessage(alert.message)}`

  return (
    <div
      class="toast toast-top toast-end z-50 pointer-events-none"
      data-page-alert-root
    >
      {isClosable
        ? (
            <input
              id={closeControlId}
              class="peer hidden"
              type="checkbox"
              aria-hidden="true"
            />
          )
        : null}
      <div
        class={`alert pointer-events-auto max-w-sm shadow-lg ${isClosable ? `peer-checked:hidden` : ''} ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`}
        data-page-alert={isClosable ? 'auto-dismiss' : undefined}
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
              <label
                class="btn btn-ghost btn-circle btn-xs"
                for={closeControlId}
                aria-label="关闭提示"
              >
                <i class="icon-[ri--close-line]" />
              </label>
            )
          : null}
      </div>
    </div>
  )
}

function hashAlertMessage(message: string): string {
  let hash = 0
  for (let index = 0; index < message.length; index += 1) {
    hash = Math.imul(31, hash) + message.charCodeAt(index) | 0
  }

  return Math.abs(hash).toString(36)
}
