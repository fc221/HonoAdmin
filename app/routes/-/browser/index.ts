import { installConfirm } from './confirm'
import { installCsrf } from './csrf'
import { installFormValidation } from './form-validation'
import { installLoadingBar } from './loading'
import { installStimulus } from './stimulus'
import { installTurbo } from './turbo'

installTurbo()
installCsrf()
installStimulus()
installFormValidation()
installLoadingBar()
installConfirm()
