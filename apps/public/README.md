# Public App

`apps/public` 是纯 HTML 占位目录，预留未来 SSR Vue 或手写 HTML 实现。

当前只提供 `index.html` 占位页，构建时由根 `scripts/build.ts` 直接拷贝到
`apps/server/dist/static/public/`，由 server 的 `'public'` 静态根分支提供服务。

在 public 范围正式启动前，不要加首页、定价、文档、博客或任何对外内容 demo。
未来引入 SSR Vue 或手写 HTML 页面时，直接在本目录实现，无需改 server 端静态根逻辑。
