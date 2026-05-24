import type { Child } from 'hono/jsx'
import CsrfField from '../../-/components/csrf-field'
import { topLevelFormTurboAttrs } from '../../-/components/turbo-frame'
import { returnToFieldName } from '../../-/utils/form'

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
  returnTo?: string
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
    <span class="contents" data-controller="modal">
      <label class={buttonClass} for={id} role="button" tabindex={0}>
        <i class={iconClass}></i>
        {buttonLabel}
      </label>
      <input class="modal-toggle" id={id} type="checkbox" />
      <div class="modal" role="dialog">
        <div class="modal-box flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-4xl flex-col overflow-hidden p-0 text-left">
          <label
            class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3 z-10"
            data-action="modal#close"
            for={id}
            role="button"
            tabindex={0}
          >
            <i class="icon-[ri--close-line]"></i>
          </label>
          <div class="shrink-0 border-b border-base-300 px-4 py-4 pr-14 sm:px-6">
            <h2 class="text-xl font-bold">{title}</h2>
          </div>
          <div class="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">{children}</div>
        </div>
        <label class="modal-backdrop" data-action="modal#close" for={id}>
          关闭
        </label>
      </div>
    </span>
  )
}

export function ConfirmActionModal({
  buttonClass = 'btn btn-link btn-xs text-error',
  buttonLabel = '删除',
  confirmLabel = '确认删除',
  id,
  inputs,
  message,
  returnTo,
  title,
}: ConfirmActionModalProps) {
  return (
    <span class="contents" data-controller="modal">
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
              data-action="modal#close"
              for={id}
              role="button"
              tabindex={0}
            >
              取消
            </label>
            <form method="post" {...topLevelFormTurboAttrs}>
              <CsrfField />
              {returnTo
                ? <input name={returnToFieldName} type="hidden" value={returnTo} />
                : null}
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
        <label class="modal-backdrop" data-action="modal#close" for={id}>
          关闭
        </label>
      </div>
    </span>
  )
}
