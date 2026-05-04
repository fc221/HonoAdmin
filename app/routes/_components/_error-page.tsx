interface ErrorPageProps {
  message: string
  path?: string
  status: number
  title: string
}

export default function ErrorPage({
  message,
  path,
  status,
  title,
}: ErrorPageProps) {
  return (
    <main class="min-h-screen bg-base-200 px-4 py-8 text-base-content">
      <title>{`${status} ${title} - HonoAdmin`}</title>
      <section class="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div class="rounded-box border border-base-300 bg-base-100 p-6 shadow-sm">
          <div class="flex items-center justify-between gap-4 text-xs font-medium uppercase tracking-[0.18em] text-base-content/45">
            <span>HonoAdmin</span>
            <span>错误状态</span>
          </div>
          <div class="mt-10 flex min-h-64 items-center justify-center">
            <div class="relative flex h-48 w-48 items-center justify-center rounded-full border border-primary/20 bg-primary/5">
              <span class="absolute inset-5 rounded-full border border-dashed border-primary/25"></span>
              <span class="text-7xl font-black text-primary">{status}</span>
            </div>
          </div>
          <div class="mt-8 grid grid-cols-3 gap-2 text-center text-xs text-base-content/45">
            <span class="rounded-box bg-base-200 px-2 py-2">request</span>
            <span class="rounded-box bg-base-200 px-2 py-2">router</span>
            <span class="rounded-box bg-base-200 px-2 py-2">render</span>
          </div>
        </div>
        <div class="min-w-0">
          <div class="badge badge-primary badge-soft mb-4">{status}</div>
          <h1 class="text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
          <p class="mt-4 max-w-xl text-base leading-7 text-base-content/65">
            {message}
          </p>
          {path
            ? (
                <p class="mt-4 max-w-full truncate rounded-box border border-base-300 bg-base-100 px-3 py-2 font-mono text-sm text-base-content/55">
                  {path}
                </p>
              )
            : null}
          <div class="mt-8 flex flex-wrap gap-3">
            <a class="btn btn-primary" href="/">
              <i class="icon-[ri--home-5-line]"></i>
              返回首页
            </a>
            <a class="btn btn-ghost" href="/admin/dashboard">
              <i class="icon-[ri--dashboard-line]"></i>
              后台首页
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
