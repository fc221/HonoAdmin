import {
  config,
  session,
} from '@hotwired/turbo'

let turboInstalled = false

export function installTurbo() {
  if (turboInstalled) {
    return
  }

  turboInstalled = true
  session.drive = true
  config.forms.mode = 'optin'
}
