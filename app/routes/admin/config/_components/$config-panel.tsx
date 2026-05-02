import type { ApiResult, ConfigItem } from '../../_components/admin-api'
import { useState } from 'hono/jsx'
import AdminTokenToolbar from '../../_components/_admin-token-toolbar'
import StatusMessage from '../../_components/_status-message'
import { requestAdminApi } from '../../_components/admin-api'
import { useAdminToken } from '../../_components/use-admin-token'
import ConfigForm from './_config-form'
import ConfigTable from './_config-table'

interface Props {
  initialConfigs: ConfigItem[]
}

const apiPath = '/api/admin/configs'

export default function ConfigPanel({ initialConfigs }: Props) {
  const { setToken, token } = useAdminToken()
  const [configs, setConfigs] = useState<ConfigItem[]>(initialConfigs)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const load = async () => {
    if (!token) {
      setMessage('请输入 Bearer Token。')
      return
    }

    setIsLoading(true)
    setMessage('')
    try {
      const result = await requestAdminApi<ConfigItem[]>(apiPath, token)
      if (!result.ok) {
        setMessage(result.error.message)
        return
      }

      setConfigs(result.data)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '请求失败。')
    } finally {
      setIsLoading(false)
    }
  }

  const createConfig = async (event: Event) => {
    event.preventDefault()
    const formElement = event.currentTarget as HTMLFormElement
    const form = new FormData(formElement)
    const result = await requestAdminApi<ConfigItem>(apiPath, token, {
      body: JSON.stringify({
        configKey: String(form.get('configKey') ?? ''),
        configType: form.get('configType'),
        configValue: String(form.get('configValue') ?? ''),
      }),
      method: 'POST',
    })

    await handleMutationResult(result, formElement)
  }

  const removeConfig = async (id: number) => {
    const result = await requestAdminApi<unknown>(`${apiPath}/${id}`, token, {
      method: 'DELETE',
    })

    await handleMutationResult(result)
  }

  async function handleMutationResult(
    result: ApiResult<unknown>,
    form?: HTMLFormElement,
  ) {
    if (!result.ok) {
      setMessage(result.error.message)
      return
    }

    form?.reset()
    setMessage('操作成功。')
    await load()
  }

  return (
    <div class="space-y-4">
      <AdminTokenToolbar
        apiPath={apiPath}
        isLoading={isLoading}
        onLoad={load}
        onTokenChange={setToken}
        token={token}
      />
      <StatusMessage message={message} />
      <section class="rounded-box border border-base-300 bg-base-100 p-4">
        <div class="mb-4 flex items-center justify-between">
          <h1 class="text-2xl font-bold">配置管理</h1>
        </div>
        <ConfigForm onCreate={createConfig} />
        <ConfigTable configs={configs} onDelete={removeConfig} />
      </section>
    </div>
  )
}
