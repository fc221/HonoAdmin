interface Props {
  onCreate: (event: Event) => void
}

export default function ConfigForm({ onCreate }: Props) {
  return (
    <form class="grid gap-3 lg:grid-cols-[160px_1fr_2fr_auto]" onSubmit={onCreate}>
      <select class="select select-bordered" name="configType">
        <option value="site">site</option>
        <option value="system">system</option>
      </select>
      <input
        class="input input-bordered"
        name="configKey"
        placeholder="config_key"
        required
      />
      <input
        class="input input-bordered"
        name="configValue"
        placeholder="config_value"
        required
      />
      <button class="btn btn-primary" type="submit">新增配置</button>
    </form>
  )
}
