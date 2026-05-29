import { createClient } from 'honox/client'
import { installConfirm } from './routes/-/browser/confirm'
import { installCsrf } from './routes/-/browser/csrf'
import { installFormValidation } from './routes/-/browser/form-validation'
import { installLoadingBar } from './routes/-/browser/loading'
import { installStimulus } from './routes/-/browser/stimulus'

import { installTurbo } from './routes/-/browser/turbo'

installTurbo()
installCsrf()
installStimulus()
installFormValidation()
installLoadingBar()
installConfirm()

createClient()
