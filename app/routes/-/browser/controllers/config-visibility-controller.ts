import type { ConfigValueMap } from '../../../../service/admin/system/config/constants'
import { Controller } from '@hotwired/stimulus'
import {
  builtInConfigDefinitions,

  isConfigDefinitionVisible
} from '../../../../service/admin/system/config/constants'

export default class ConfigVisibilityController extends Controller<HTMLFormElement> {
  connect() {
    this.sync()
  }

  sync() {
    const values = this.readValues()

    for (const field of Array.from(
      this.element.querySelectorAll<HTMLElement>('[data-config-field="true"]'),
    )) {
      const configKey = field.dataset.configKey
      const definition = builtInConfigDefinitions.find((item) =>
        item.configKey === configKey
      )

      field.classList.toggle(
        'hidden',
        !isConfigDefinitionVisible(definition, values),
      )
    }
  }

  reset() {
    window.setTimeout(() => this.sync())
  }

  private readValues(): ConfigValueMap {
    const values = Object.fromEntries(
      builtInConfigDefinitions.map((definition) => [
        definition.configKey,
        definition.configValue,
      ]),
    ) as ConfigValueMap

    for (const element of Array.from(
      this.element.querySelectorAll('[data-config-key]'),
    )) {
      const field = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      if (field.dataset.configKey) {
        values[field.dataset.configKey] = field.value
      }
    }

    return values
  }
}
