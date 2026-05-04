export type FieldErrors = Record<string, string[]>
export type FormField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
export type ValidationErrorElement = FormField | HTMLElement
export type ValidateTrigger = 'blur' | 'change'

export interface PageAlertState {
  closable?: boolean
  message: string
  type: 'error' | 'success'
}

export interface PjaxActionResult {
  alert: PageAlertState
  fieldErrors?: FieldErrors
  formErrors?: string[]
  honoAdminAction: true
  ok: boolean
  replace: boolean
  target: string
}

export interface PjaxHistoryState {
  honoAdminPjax?: true
  previousUrl?: string
}

export interface VisitOptions {
  fallback?: 'navigate' | 'none' | 'reload'
  mode?: 'navigate' | 'refresh'
  replace?: boolean
  scroll?: boolean
}
