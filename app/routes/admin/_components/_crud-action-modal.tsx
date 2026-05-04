import type { Child } from 'hono/jsx'

interface HiddenInput {
  name: string
  value: number | string
}

interface CreateActionModalProps {
  buttonClass?: string
  buttonLabel: string
  children: Child
  iconClass?: string
  id: string
  title: string
}

interface ConfirmActionModalProps {
  buttonClass?: string
  buttonLabel?: string
  confirmLabel?: string
  id: string
  inputs: HiddenInput[]
  message: string
  title: string
}

export function CreateActionModal({
  buttonClass = 'btn btn-primary btn-sm',
  buttonLabel,
  children,
  iconClass = 'icon-[ri--add-line]',
  id,
  title,
}: CreateActionModalProps) {
  return (
    <ActionModal
      buttonClass={buttonClass}
      buttonLabel={buttonLabel}
      iconClass={iconClass}
      id={id}
      title={title}
    >
      {children}
    </ActionModal>
  )
}

export function EditActionModal({
  buttonClass = 'btn btn-link btn-xs',
  buttonLabel,
  children,
  iconClass = 'icon-[ri--edit-line]',
  id,
  title,
}: CreateActionModalProps) {
  return (
    <ActionModal
      buttonClass={buttonClass}
      buttonLabel={buttonLabel}
      iconClass={iconClass}
      id={id}
      title={title}
    >
      {children}
    </ActionModal>
  )
}

function ActionModal({
  buttonClass,
  buttonLabel,
  children,
  iconClass,
  id,
  title,
}: Required<CreateActionModalProps>) {
  return (
    <>
      <label class={buttonClass} for={id} role="button" tabindex={0}>
        <i class={iconClass}></i>
        {buttonLabel}
      </label>
      <input class="modal-toggle" id={id} type="checkbox" />
      <div class="modal" role="dialog">
        <div class="modal-box flex max-h-[calc(100dvh-2rem)] max-w-4xl flex-col overflow-hidden p-0 text-left">
          <label
            class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3 z-10"
            for={id}
            role="button"
            tabindex={0}
          >
            <i class="icon-[ri--close-line]"></i>
          </label>
          <div class="shrink-0 border-b border-base-300 px-6 py-4 pr-14">
            <h2 class="text-xl font-bold">{title}</h2>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        </div>
        <label class="modal-backdrop" for={id}>
          关闭
        </label>
      </div>
    </>
  )
}

export function ConfirmActionModal({
  buttonClass = 'btn btn-link btn-xs text-error',
  buttonLabel = '删除',
  confirmLabel = '确认删除',
  id,
  inputs,
  message,
  title,
}: ConfirmActionModalProps) {
  return (
    <>
      <label class={buttonClass} for={id} role="button" tabindex={0}>
        {buttonLabel}
      </label>
      <input class="modal-toggle" id={id} type="checkbox" />
      <div class="modal" role="dialog">
        <div class="modal-box max-w-md text-left">
          <h2 class="text-xl font-bold">{title}</h2>
          <p class="mt-3 text-sm leading-6 text-base-content/65">{message}</p>
          <div class="modal-action">
            <label
              class="btn btn-ghost btn-sm"
              for={id}
              role="button"
              tabindex={0}
            >
              取消
            </label>
            <form data-pjax="true" method="post">
              {inputs.map((input) => (
                <input
                  key={`${input.name}:${input.value}`}
                  name={input.name}
                  type="hidden"
                  value={input.value}
                />
              ))}
              <button class="btn btn-error btn-sm" type="submit">
                {confirmLabel}
              </button>
            </form>
          </div>
        </div>
        <label class="modal-backdrop" for={id}>
          关闭
        </label>
      </div>
    </>
  )
}
