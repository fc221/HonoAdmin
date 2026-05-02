import type { ApiResult, UserItem } from '../../_components/admin-api'
import { useState } from 'hono/jsx'
import AdminTokenToolbar from '../../_components/_admin-token-toolbar'
import StatusMessage from '../../_components/_status-message'
import { requestAdminApi } from '../../_components/admin-api'
import { useAdminToken } from '../../_components/use-admin-token'
import UserForm from './_user-form'
import UserTable from './_user-table'

interface Props {
  initialUsers: UserItem[]
}

const apiPath = '/api/admin/users'

export default function UserPanel({ initialUsers }: Props) {
  const { setToken, token } = useAdminToken()
  const [users, setUsers] = useState<UserItem[]>(initialUsers)
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
      const result = await requestAdminApi<UserItem[]>(apiPath, token)
      if (!result.ok) {
        setMessage(result.error.message)
        return
      }

      setUsers(result.data)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '请求失败。')
    } finally {
      setIsLoading(false)
    }
  }

  const createUser = async (event: Event) => {
    event.preventDefault()
    const formElement = event.currentTarget as HTMLFormElement
    const form = new FormData(formElement)
    const result = await requestAdminApi<UserItem>(apiPath, token, {
      body: JSON.stringify({
        avatar: null,
        isRoot: form.get('isRoot') === 'on',
        nickname: String(form.get('nickname') ?? '') || null,
        password: String(form.get('password') ?? ''),
        username: String(form.get('username') ?? ''),
      }),
      method: 'POST',
    })

    await handleMutationResult(result, formElement)
  }

  const removeUser = async (id: number) => {
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
          <h1 class="text-2xl font-bold">用户管理</h1>
        </div>
        <UserForm onCreate={createUser} />
        <UserTable users={users} onDelete={removeUser} />
      </section>
    </div>
  )
}
