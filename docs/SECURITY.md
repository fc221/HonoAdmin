# 默认安全配置

HonoAdmin 默认把安装、会话、权限和迁移放在服务端流程里处理，适合公开部署前做一次基础安全检查。

## 安装与 root 管理员

- 首次部署后访问 `/install`，完成运行时配置检查、数据库迁移和第一个 root 管理员创建。
- root 管理员只能通过安装流程创建；后台用户管理不支持新增或提升 root 用户。
- 系统会阻止移除或禁用最后一个正常 root 用户，避免后台失去维护入口。

## Secret 与会话

- `JWT_SECRET` 和 `SESSION_SECRET` 必须使用不同的强随机字符串。`JWT_SECRET` 保留给 API/JWT 能力，`SESSION_SECRET` 用于后台 session cookie 签名。
- Cloudflare Workers 使用 `wrangler secret put JWT_SECRET` 和 `wrangler secret put SESSION_SECRET` 配置，本地 Bun 开发由安装页写入环境配置文件。
- 会话 cookie 默认 `httpOnly`、`sameSite=Lax`，在 HTTPS 请求下自动启用 `secure`。
- “记住我”会把会话最长保留 7 天；未勾选时使用浏览器会话生命周期。

## 权限与审计

- 非 root 用户通过角色获得菜单权限和操作权限。
- 数据库迁移由 root 管理员在更新管理中执行。
- 登录、退出、资料更新、密码修改和后台业务操作会写入操作日志。

## 部署与存储

- 生产环境必须使用 HTTPS。
- 不要把 `JWT_SECRET`、`SESSION_SECRET`、对象存储 access key、secret key、数据库 id 等敏感配置提交到公开仓库。
- Workers 部署使用 D1 `DB` binding；可选 KV cache 使用 `CACHE` binding。
- 文件上传在 Workers 环境下应使用后台文件配置里的 S3 兼容对象存储配置。Cloudflare R2 密钥应通过部署环境或后台配置安全管理。
