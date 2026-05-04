import { createClient } from 'honox/client'
import { installCheckboxGroupActions } from './client/checkbox-group-actions'
import { installFileUploads } from './client/file-upload'
import { installPjax, supportsPjax } from './client/pjax'
import { initializeRadioTabs } from './client/radio-tabs'
import {
  installRichTextEditors,
  syncRichTextEditors,
} from './client/rich-text'
import {
  initializePageAlerts,
  installUiInteractions,
} from './client/ui'

void hydrateIslands()
installUiInteractions()
installCheckboxGroupActions()
installFileUploads()
if (supportsPjax()) {
  installPjax({ hydrate: hydrateIslands })
}
installRichTextEditors()

async function hydrateIslands() {
  await createClient()
  initializeRadioTabs()
  initializePageAlerts()
  syncRichTextEditors()
}
