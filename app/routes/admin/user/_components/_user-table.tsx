import type { UserItem } from '../../_components/admin-api'

interface Props {
  onDelete: (id: number) => void
  users: UserItem[]
}

export default function UserTable({ onDelete, users }: Props) {
  return (
    <div class="mt-4 overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>用户名</th>
            <th>昵称</th>
            <th>角色</th>
            <th>更新时间</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td class="font-mono">{user.username}</td>
              <td>{user.nickname ?? '-'}</td>
              <td>
                <span class={`badge ${user.isRoot ? 'badge-primary' : 'badge-ghost'}`}>
                  {user.isRoot ? 'root' : 'user'}
                </span>
              </td>
              <td>{user.updatedAt}</td>
              <td>
                <button
                  class="btn btn-ghost btn-xs text-error"
                  type="button"
                  onClick={() => onDelete(user.id)}
                >
                  删除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
