interface Props {
  onCreate: (event: Event) => void
}

export default function UserForm({ onCreate }: Props) {
  return (
    <form class="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto_auto]" onSubmit={onCreate}>
      <input
        class="input input-bordered"
        name="username"
        placeholder="username"
        required
      />
      <input
        class="input input-bordered"
        name="password"
        placeholder="password"
        required
        type="password"
      />
      <input class="input input-bordered" name="nickname" placeholder="nickname" />
      <label class="label cursor-pointer justify-start gap-2">
        <input class="checkbox checkbox-primary" name="isRoot" type="checkbox" />
        <span class="label-text">root</span>
      </label>
      <button class="btn btn-primary" type="submit">新增用户</button>
    </form>
  )
}
