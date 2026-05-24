import type {
  FormField,
  ValidateTrigger,
  ValidationErrorElement,
} from './types'

let formValidationInstalled = false

export function installFormValidation() {
  if (formValidationInstalled) {
    return
  }

  formValidationInstalled = true

  document.addEventListener('invalid', (event) => {
    const field = getEventFormField(event)
    const form = field ? getFieldForm(field) : null

    if (field && form) {
      applyNativeFieldValidation(form, field)
    }
  }, true)

  document.addEventListener('blur', (event) => {
    validateFieldForEvent(event, 'blur')
  }, true)

  document.addEventListener('input', (event) => {
    validateFieldForEvent(event, 'change')
  })

  document.addEventListener('change', (event) => {
    validateFieldForEvent(event, 'change')
  })
}

function validateFieldForEvent(event: Event, trigger: ValidateTrigger) {
  const field = getEventFormField(event)
  const form = field ? getFieldForm(field) : null

  if (
    !field
    || !form
    || isHiddenInput(field)
    || !shouldValidateFieldOnTrigger(form, field, trigger)
  ) {
    return
  }

  applyNativeFieldValidation(form, field)
}

export function getEventFormField(event: Event): FormField | null {
  const target = event.target
  return isFormField(target) ? target : null
}

export function getFieldForm(field: FormField): HTMLFormElement | null {
  return field.form ?? field.closest<HTMLFormElement>('form')
}

export function applyNativeFieldValidation(
  form: HTMLFormElement,
  field: FormField,
  options: { allowHidden?: boolean } = {},
) {
  if (!field.name || (isHiddenInput(field) && !options.allowHidden)) {
    return
  }

  if (field.validity.valid) {
    clearFieldValidationError(form, field.name, field)
    return
  }

  applyFieldValidationError(form, field.name, [
    field.validationMessage || '请检查该字段。',
  ], field)
}

export function shouldValidateFieldOnTrigger(
  form: HTMLFormElement,
  field: FormField,
  trigger: ValidateTrigger,
): boolean {
  return getFieldValidateTriggers(form, field).has(trigger)
}

export function isFormField(field: unknown): field is FormField {
  return (
    field instanceof HTMLInputElement
    || field instanceof HTMLSelectElement
    || field instanceof HTMLTextAreaElement
  )
}

function applyFieldValidationError(
  form: HTMLFormElement,
  fieldName: string,
  messages: string[],
  preferredField?: FormField,
): boolean {
  const field = preferredField ?? findNamedFormField(form, fieldName)
  const container = findFieldContainer(form, fieldName, field)

  if (!container) {
    return false
  }

  if (field && !isHiddenInput(field)) {
    field.setAttribute('aria-invalid', 'true')
    field.dataset.validationError = 'true'
    addFieldErrorClass(field)
  }

  const richTextEditor = container.querySelector<HTMLElement>(
    '[data-rich-text-editor="true"]',
  )
  if (richTextEditor) {
    richTextEditor.dataset.validationError = 'true'
    richTextEditor.classList.add('border-error')
  }

  return setFieldValidationMessage(container, messages)
}

function setFieldValidationMessage(
  container: HTMLElement,
  messages: string[],
): boolean {
  const message = messages.join(' ')
  const target = findValidationMessageTarget(container)

  if (target) {
    if (target.dataset.validationOriginalText === undefined) {
      target.dataset.validationOriginalText = target.textContent ?? ''
      target.dataset.validationOriginalClass = target.getAttribute('class') ?? ''
    }
    target.dataset.validationMessage = 'true'
    target.classList.add('text-error')
    target.textContent = message
    return true
  }

  const error = document.createElement('p')
  error.className = 'label text-error'
  error.dataset.fieldError = 'true'
  error.textContent = message
  container.appendChild(error)
  return true
}

function clearFieldValidationError(
  form: HTMLFormElement,
  fieldName: string,
  preferredField?: FormField,
) {
  const field = preferredField ?? findNamedFormField(form, fieldName)
  const container = findFieldContainer(form, fieldName, field)

  container
    ?.querySelectorAll<HTMLElement>('[data-field-error="true"]')
    .forEach((element) => element.remove())
  container
    ?.querySelectorAll<HTMLElement>('[data-validation-message="true"]')
    .forEach(restoreValidationMessageTarget)

  if (field) {
    clearValidationErrorElement(field)
  }

  container
    ?.querySelectorAll<HTMLElement>(
      '[data-rich-text-editor="true"][data-validation-error="true"]',
    )
    .forEach(clearValidationErrorElement)
}

function clearValidationErrorElement(element: ValidationErrorElement) {
  element.removeAttribute('aria-invalid')
  element.classList.remove(
    'border-error',
    'input-error',
    'select-error',
    'textarea-error',
  )
  delete element.dataset.validationError
}

function restoreValidationMessageTarget(element: HTMLElement) {
  const originalText = element.dataset.validationOriginalText
  const originalClass = element.dataset.validationOriginalClass

  if (originalText !== undefined) {
    element.textContent = originalText
  }

  if (originalClass !== undefined) {
    if (originalClass) {
      element.setAttribute('class', originalClass)
    } else {
      element.removeAttribute('class')
    }
  }

  delete element.dataset.validationMessage
  delete element.dataset.validationOriginalText
  delete element.dataset.validationOriginalClass
}

function findNamedFormField(
  form: HTMLFormElement,
  fieldName: string,
): FormField | null {
  for (const field of Array.from(form.elements)) {
    if (isFormField(field) && field.name === fieldName) {
      return field
    }
  }

  return null
}

function findFieldContainer(
  form: HTMLFormElement,
  fieldName: string,
  field: FormField | null,
): HTMLElement | null {
  const dataContainer = findDataFormFieldContainer(form, fieldName)
  if (dataContainer) {
    return dataContainer
  }

  if (!field || isHiddenInput(field)) {
    return null
  }

  return field.closest<HTMLElement>('[data-form-field], fieldset, label')
    ?? field.parentElement
}

function findDataFormFieldContainer(
  form: HTMLFormElement,
  fieldName: string,
): HTMLElement | null {
  for (const element of Array.from(form.querySelectorAll<HTMLElement>(
    '[data-form-field]',
  ))) {
    if (element.dataset.formField === fieldName) {
      return element
    }
  }

  return null
}

function isHiddenInput(field: FormField): boolean {
  return field instanceof HTMLInputElement && field.type === 'hidden'
}

function addFieldErrorClass(field: FormField) {
  if (field instanceof HTMLSelectElement) {
    field.classList.add('select-error')
    return
  }

  if (field instanceof HTMLTextAreaElement) {
    field.classList.add('textarea-error')
    return
  }

  field.classList.add('input-error')
}

function findValidationMessageTarget(container: HTMLElement): HTMLElement | null {
  const configuredTarget = container.matches('[data-validation-label="true"]')
    ? container
    : container.querySelector<HTMLElement>('[data-validation-label="true"]')
  if (configuredTarget) {
    return configuredTarget
  }

  const labels = Array.from(container.querySelectorAll<HTMLElement>('.label'))
  for (const label of labels) {
    if (label.tagName !== 'LABEL') {
      return label
    }
  }

  return container.querySelector<HTMLElement>(
    '.fieldset-legend, .label-text, legend',
  )
}

function getFieldValidateTriggers(
  form: HTMLFormElement,
  field: FormField,
): Set<ValidateTrigger> {
  const fieldContainer = findFieldContainer(form, field.name, field)
  const value = field.dataset.validateTrigger
    ?? fieldContainer?.dataset.validateTrigger
    ?? form.dataset.validateTrigger
    ?? 'blur'
  const triggers = new Set<ValidateTrigger>()

  for (const item of value.split(/[\s,]+/)) {
    if (item === 'blur' || item === 'change') {
      triggers.add(item)
    }
  }

  if (triggers.size === 0) {
    triggers.add('blur')
  }

  return triggers
}
