declare module '@hotwired/turbo' {
  export const config: {
    forms: {
      mode: 'off' | 'on' | 'optin'
    }
  }

  export const session: {
    drive: boolean
  }
}
