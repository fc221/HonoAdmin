# Admin Performance Boundaries

This project is a native SQL admin system. Keep CRUD features portable across
SQLite, Cloudflare D1, MySQL, and PostgreSQL by writing SQL through the
`DBAdapter` interface and avoiding database-specific query builders in service
code.

## List Pages

- Default pagination must stay at `10` rows and must not exceed `100` rows.
- List pages should query rows with `LIMIT/OFFSET` and a deterministic `ORDER BY`.
- Every list page should have an index for its default sort once the table can
  grow beyond a few thousand rows.
- Do not return rich text or large JSON columns in list queries unless the table
  actually displays them. Prefer separate detail reads for large content.

## Search

- Current keyword search uses portable `LIKE` conditions and is suitable for
  small admin datasets.
- Treat `LIKE` search as a convenience filter, not a full-text search system.
- Keyword fields must be curated per list. Prefer short, user-facing text
  columns such as names, codes, phone numbers, and email addresses; avoid IDs,
  timestamps, status fields with dedicated filters, rich text, JSON, logs, and
  other large columns in generic keyword search.
- Once a table reaches about `50k` rows, review the search columns. Narrow the
  searchable columns first; introduce database-specific full-text search only
  behind an adapter or service strategy.
- Avoid adding computed `LOWER(COALESCE(...)) LIKE ?` searches to high-write log
  tables without a retention policy.

## Operate Logs

- Operate logs must stay paginated. Do not add "export all" or unbounded list
  endpoints without streaming/chunking.
- The default admin log view is optimized by indexes on `(created_at, id)` and
  `(log_type, created_at, id)`.
- Keep a retention policy before production use. Recommended starting point:
  keep 90 days or the latest 100k rows, whichever is smaller.
- Destructive log cleanup must remain an explicit admin action and should write
  its own operate log entry.

## Index Policy

- Add indexes through a new migration only. Never edit an applied migration.
- Index names should be stable and explicit: `idx_<table>_<columns>`.
- Prefer indexes that match actual list filters and sort order.
- Keep indexes conservative. Every extra index slows writes and consumes D1 /
  SQL storage.

## CRUD Portability

- New CRUD services should use native SQL through `ctx.db`.
- Avoid database-specific syntax in service queries. If a feature requires
  non-portable SQL, hide it behind an adapter-level method or feature strategy.
- Generated CRUD files from `bun run scaffold:crud` are a starting point, not a
  finished feature. Always add the migration, service export, menu entry, and
  tests before merging.
