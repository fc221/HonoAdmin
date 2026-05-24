import type { ConfigRecord } from '../app/service/admin/system/config/dto'
import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import ConfigPanel from '../app/routes/admin/system/config/-components/config-panel'
import {
  builtInConfigDefinitions,
} from '../app/service/admin/system/config/constants'

describe('config panel', () => {
  test('server renders storage driver dependent fields with initial visibility', async () => {
    const html = await renderConfigPanel('local')

    expect(getFieldsetHtml(html, 'file_local_root')).not.toContain('hidden')
    expect(getFieldsetHtml(html, 'file_public_base_url')).not.toContain('hidden')
    expect(getFieldsetHtml(html, 'file_s3_endpoint')).toContain('hidden')
    expect(getFieldsetHtml(html, 'file_s3_bucket')).toContain('hidden')
  })

  test('server renders S3 fields when the storage driver is S3', async () => {
    const html = await renderConfigPanel('s3')

    expect(getFieldsetHtml(html, 'file_local_root')).toContain('hidden')
    expect(getFieldsetHtml(html, 'file_public_base_url')).toContain('hidden')
    expect(getFieldsetHtml(html, 'file_s3_endpoint')).not.toContain('hidden')
    expect(getFieldsetHtml(html, 'file_s3_bucket')).not.toContain('hidden')
  })
})

async function renderConfigPanel(storageDriver: 'local' | 's3'): Promise<string> {
  const app = new Hono()
  const configs = createConfigRecords(storageDriver)

  app.get('/', (c) =>
    c.html(
      <ConfigPanel
        activeType="file"
        configs={configs}
      />,
    ))

  const response = await app.request('/')
  return response.text()
}

function createConfigRecords(storageDriver: 'local' | 's3'): ConfigRecord[] {
  return builtInConfigDefinitions.map((definition, index) => ({
    configKey: definition.configKey,
    configType: definition.configType,
    configValue: definition.configKey === 'file_storage_driver'
      ? storageDriver
      : definition.configValue,
    createdAt: 1767225600000,
    id: index + 1,
    updatedAt: 1767225600000,
  }))
}

function getFieldsetHtml(html: string, configKey: string): string {
  const keyIndex = html.indexOf(`data-config-key="${configKey}"`)
  expect(keyIndex).toBeGreaterThanOrEqual(0)

  const fieldsetStart = html.lastIndexOf('<fieldset', keyIndex)
  const fieldsetEnd = html.indexOf('</fieldset>', keyIndex)
  expect(fieldsetStart).toBeGreaterThanOrEqual(0)
  expect(fieldsetEnd).toBeGreaterThanOrEqual(0)

  return html.slice(fieldsetStart, fieldsetEnd)
}
