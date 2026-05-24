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
  const isClosable = alert ? alert.closable ?? closable : false

  if (!alert) {
    return null
  }

  return (
    <div
      class="toast toast-top toast-end z-50 pointer-events-none"
      data-controller="page-alert"
      data-page-alert-closable-value={isClosable ? 'true' : 'false'}
    >
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
                data-action="page-alert#close"
              >
                <i class="icon-[ri--close-line]" />
              </button>
            )
          : null}
      </div>
    </div>
  )
}
