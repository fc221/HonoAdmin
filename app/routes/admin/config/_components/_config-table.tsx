import type { ConfigItem } from '../../_components/admin-api'

interface Props {
  configs: ConfigItem[]
  onDelete: (id: number) => void
}

export default function ConfigTable({ configs, onDelete }: Props) {
  return (
    <div class="mt-4 overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>类型</th>
            <th>Key</th>
            <th>Value</th>
            <th>更新时间</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {configs.map((config) => (
            <tr key={config.id}>
              <td>{config.id}</td>
              <td><span class="badge">{config.configType}</span></td>
              <td class="font-mono">{config.configKey}</td>
              <td class="max-w-md truncate">{config.configValue}</td>
              <td>{config.updatedAt}</td>
              <td>
                <button
                  class="btn btn-ghost btn-xs text-error"
                  type="button"
                  onClick={() => onDelete(config.id)}
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
