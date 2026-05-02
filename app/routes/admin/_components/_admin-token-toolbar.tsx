interface Props {
  apiPath: string
  isLoading: boolean
  onLoad: () => void
  onTokenChange: (token: string) => void
  token: string
}

export default function AdminTokenToolbar({
  apiPath,
  isLoading,
  onLoad,
  onTokenChange,
  token,
}: Props) {
  return (
    <div class="flex flex-col gap-3 rounded-box border border-base-300 bg-base-100 p-4 lg:flex-row lg:items-end">
      <label class="form-control flex-1">
        <span class="label-text mb-1">Bearer Token</span>
        <input
          class="input input-bordered w-full"
          type="password"
          value={token}
          placeholder="输入 JWT_SECRET 对应的 token"
          onInput={(event) =>
            onTokenChange((event.currentTarget as HTMLInputElement).value)}
        />
      </label>
      <button
        class="btn btn-primary"
        type="button"
        onClick={onLoad}
        disabled={isLoading}
      >
        {isLoading
          ? <span class="loading loading-spinner loading-sm" />
          : <i class="icon-[ri--refresh-line]" />}
        加载
      </button>
      <a class="btn btn-ghost" href="/api/admin/openapi.json" target="_blank">
        <i class="icon-[ri--file-list-3-line]" />
        OpenAPI
      </a>
      <span class="badge badge-outline self-start lg:self-center">{apiPath}</span>
    </div>
  )
}
