interface Props {
  siteTitle: string
}

const featureItems = [
  '兼容 Node.js, Bun, Cloudflare Workers',
  '原生 SQL 支持，极简的数据访问层',
  '内置 RBAC 权限体系与角色管理',
]

export default function LoginBrandPanel({ siteTitle }: Props) {
  return (
    <div
      class="hidden flex-col justify-between border-base-content/10 bg-base-300/35 p-12 lg:flex lg:border-r"
      data-login-brand-panel="true"
    >
      <div>
        <a href="/" class="mb-10 flex w-fit items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-box bg-primary text-xl text-primary-content shadow-lg shadow-primary/20">
            <i class="icon-[ri--flashlight-line]" />
          </span>
          <span class="text-2xl font-bold">{siteTitle}</span>
        </a>

        <h1 class="mb-6 text-4xl font-semibold leading-tight">
          高性能通用后台框架
          <br />
          <span class="text-primary">为边缘计算而生</span>
        </h1>

        <ul class="space-y-4">
          {featureItems.map((item) => (
            <li class="flex items-center gap-3 text-base-content/65" key={item}>
              <i class="icon-[ri--checkbox-circle-line] text-xl text-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div class="rounded-box border border-base-content/10 bg-base-100/55 p-5 shadow-sm backdrop-blur">
        <div class="mb-3 flex items-center gap-4">
          <div class="flex gap-1">
            <span class="h-2.5 w-2.5 rounded-full bg-error/60" />
            <span class="h-2.5 w-2.5 rounded-full bg-warning/60" />
            <span class="h-2.5 w-2.5 rounded-full bg-success/60" />
          </div>
          <span class="text-[10px] font-bold uppercase tracking-widest text-base-content/40">
            Terminal Preview
          </span>
        </div>
        <code class="font-mono text-xs leading-6 text-primary">
          $ git clone https://github.com/fc221/HonoAdmin.git
          <br />
          <span class="text-base-content/45">
            &gt; cd HonoAdmin && bun install
          </span>
          <br />
          <span class="text-base-content/45">
            &gt; Runtime detected:
            {' '}
            <span class="text-success">Bun</span>
          </span>
          <br />
          <span class="font-bold text-success">
            ✓ bun run dev at http://localhost:5173
          </span>
        </code>
      </div>
    </div>
  )
}
