# Cloudflare Workers 部署

HonoAdmin 的 Workers 运行时通过 Hono Context 注入 `DB`、`CACHE`、`APP_TIMEZONE`、`JWT_SECRET` 和 `SESSION_SECRET`。业务代码不直接读取平台全局对象，部署时只需要把绑定名称配置成框架约定的名字。

## 绑定示例

```jsonc
{
  "name": "hono-admin",
  "main": "./dist/index.js",
  "compatibility_date": "2026-04-19",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "./dist"
  },
  "vars": {
    "APP_TIMEZONE": "Asia/Shanghai"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "hono-admin",
      "database_id": "<your-d1-database-id>"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "CACHE",
      "id": "<your-kv-namespace-id>"
    }
  ]
}
```

`DB` 是必需的 D1 数据库绑定。`CACHE` 是可选 KV 绑定；没有配置时会使用 noop cache adapter。`APP_TIMEZONE` 用于后台展示时间；`c.now()` 使用统一毫秒时间戳。`JWT_SECRET` 和 `SESSION_SECRET` 必须通过 secret 配置：

```bash
wrangler secret put JWT_SECRET
wrangler secret put SESSION_SECRET
```

## 部署流程

```bash
bun install
bun run build
wrangler deploy
```

首次访问部署地址时进入 `/install`，按页面提示检查运行时配置、执行数据库迁移，并创建第一个 root 管理员。

## 文件存储

Workers 环境不能使用本地文件存储。当前文件上传的对象存储能力走后台“系统配置 / 文件配置”里的 S3 兼容配置，例如 Cloudflare R2 endpoint、bucket、access key 和 secret key。不要在 Workers runtime binding 中新增未被代码读取的 R2 binding，以免配置和实际运行方式不一致。
