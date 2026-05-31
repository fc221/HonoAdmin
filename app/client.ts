import { createClient } from 'honox/client'
import { installConfirm } from './routes/-/browser/confirm'
import { installCsrf } from './routes/-/browser/csrf'
import { installFormValidation } from './routes/-/browser/form-validation'
import { installLoadingBar } from './routes/-/browser/loading'
import { installPasswordVisibility } from './routes/-/browser/password-visibility'
import { installStimulus } from './routes/-/browser/stimulus'

import { installTurbo } from './routes/-/browser/turbo'

installTurbo()
installCsrf()
installStimulus()
installFormValidation()
installPasswordVisibility()
installLoadingBar()
installConfirm()

createClient()
