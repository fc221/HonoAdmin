# Default Security Configuration

HonoAdmin keeps installation, sessions, authorization, and migrations in server-side flows. Before publishing or deploying publicly, review the defaults below.

## Installation And Root Admin

- After the first deployment, visit `/install` to check runtime configuration, run database migrations, and create the first root administrator.
- Root administrators can only be created through the installation flow. The admin user management page cannot create or promote root users.
- The system prevents removing or disabling the last active root user, so the admin console keeps a maintenance entrypoint.

## Secrets And Sessions

- `JWT_SECRET` and `SESSION_SECRET` must be different strong random strings. `JWT_SECRET` is reserved for API/JWT features, while `SESSION_SECRET` signs admin session cookies.
- On Cloudflare Workers, configure them with `wrangler secret put JWT_SECRET` and `wrangler secret put SESSION_SECRET`; for local Bun development, the install page writes them to the runtime env file.
- The session cookie is `httpOnly` and `sameSite=Lax` by default, and `secure` is enabled automatically on HTTPS requests.
- The "remember me" option keeps a session for up to 7 days. Without it, the browser session lifecycle is used.

## Authorization And Audit Logs

- Non-root users receive menu permissions and operation permissions through roles.
- Database migrations are executed by root administrators from update management.
- Login, logout, profile updates, password changes, and admin business operations are recorded in operation logs.

## Deployment And Storage

- Production deployments must use HTTPS.
- Do not commit `JWT_SECRET`, `SESSION_SECRET`, object-storage access keys, secret keys, database ids, or other sensitive deployment values to a public repository.
- Workers deployments use the D1 `DB` binding. Optional KV cache uses the `CACHE` binding.
- In Workers, uploads should use the S3-compatible object-storage settings from the admin file configuration. Cloudflare R2 credentials should be managed through the deployment environment or secured admin configuration.
