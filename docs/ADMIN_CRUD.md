# Admin CRUD Scaffold

Use the scaffold script to create a native SQL admin CRUD starting point:

```bash
bun run scaffold:crud -- \
  --dry-run \
  --name article \
  --title 文章 \
  --route web/article \
  --table web_article \
  --fields "title:string:required,alias:string:required:unique,content:text:required,isTop:boolean"
```

The script creates:

- `app/service/admin/system/<name>` DTO, entity, and service files.
- `app/routes/admin/<route>` index, add, edit, action, form, panel, and table
  starter files.

After scaffolding, finish the feature manually:

- Add and register a migration for the table.
- Add permission seeds for view and POST actions in every migration dialect.
- Add the menu entry in `app/service/admin/system/menu/consts.ts`.
- Include `<CsrfField />` in every non-GET HTML form.
- Use `topLevelFormTurboAttrs` for mutating forms and `ListTurboFrame` only for list search/pagination.
- Add focused tests for schema, action result, and service CRUD.
- Run `bun run check`.

## Field Syntax

Field format is `name:kind:flags`.

- `kind`: `string`, `text`, or `boolean`.
- `flags`: `required` and `unique` are accepted.

The generator intentionally uses portable native SQL patterns only. For MySQL,
PostgreSQL, SQLite, and D1 compatibility, keep generated queries behind the
project `DBAdapter` instead of introducing an ORM or query builder.

When a CRUD adds schema, create the same migration id/name/order in
`app/migrations/sqlite`, `app/migrations/mysql`, and `app/migrations/pg`.
Use explicit SQL for each dialect; D1 reuses the SQLite migration set.
