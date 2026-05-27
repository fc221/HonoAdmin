import { Application } from '@hotwired/stimulus'
import AvatarImageController from './controllers/avatar-image-controller'
import AvatarUploadController from './controllers/avatar-upload-controller'
import ConfigVisibilityController from './controllers/config-visibility-controller'
import DropdownController from './controllers/dropdown-controller'
import FileDropzoneController from './controllers/file-dropzone-controller'
import FileUploadFieldController from './controllers/file-upload-field-controller'
import HistoryBackController from './controllers/history-back-controller'
import LayoutController from './controllers/layout-controller'
import ModalController from './controllers/modal-controller'
import MultiSelectController from './controllers/multi-select-controller'
import PageAlertController from './controllers/page-alert-controller'
import RichTextController from './controllers/rich-text-controller'
import RolePermissionController from './controllers/role-permission-controller'
import SettingsController from './controllers/settings-controller'
import ThemeController from './controllers/theme-controller'
import UpdateStatusController from './controllers/update-status-controller'

let stimulusApplication: Application | null = null

export function installStimulus() {
  if (stimulusApplication) {
    return stimulusApplication
  }

  const application = Application.start()

  application.register('avatar-image', AvatarImageController)
  application.register('avatar-upload', AvatarUploadController)
  application.register('config-visibility', ConfigVisibilityController)
  application.register('dropdown', DropdownController)
  application.register('file-dropzone', FileDropzoneController)
  application.register('file-upload-field', FileUploadFieldController)
  application.register('history-back', HistoryBackController)
  application.register('layout', LayoutController)
  application.register('modal', ModalController)
  application.register('multi-select', MultiSelectController)
  application.register('page-alert', PageAlertController)
  application.register('rich-text', RichTextController)
  application.register('role-permission', RolePermissionController)
  application.register('settings', SettingsController)
  application.register('theme', ThemeController)
  application.register('update-status', UpdateStatusController)

  stimulusApplication = application
  return application
}
