import { createClient } from 'honox/client'
import { installFormValidation } from './client/form-validation'
import { installHistoryReplaceNavigation } from './client/navigation-replace'

installFormValidation()
installHistoryReplaceNavigation()

void createClient()
