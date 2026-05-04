# Cloudflare Workers Deployment

The HonoAdmin Workers runtime injects `DB`, `CACHE`, `APP_TIMEZONE`, and `JWT_SECRET` through the Hono Context. Business code does not read platform globals directly, so deployment only needs to use the binding names expected by the runtime adapter.

## Binding Example

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

`DB` is the required D1 database binding. `CACHE` is an optional KV binding; when it is not configured, HonoAdmin uses the noop cache adapter. `APP_TIMEZONE` controls admin time display and `c.now()`. Configure `JWT_SECRET` as a Worker secret:

```bash
wrangler secret put JWT_SECRET
```

## Deploy

```bash
bun install
bun run build
wrangler deploy
```

On the first visit, open `/install` to check runtime configuration, run database migrations, and create the first root administrator.

## File Storage

Cloudflare Workers cannot use local file storage. The current upload flow uses S3-compatible settings from the admin system file configuration, such as the Cloudflare R2 endpoint, bucket, access key, and secret key. Do not add an unused R2 runtime binding unless the runtime adapter is extended to read it.
