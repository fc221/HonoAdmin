# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, or
- **`CONTEXT-MAP.md`** at the repo root if it exists — it points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in. In multi-context repos, also check `src/<context>/docs/adr/` for context-scoped decisions.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

This repo is **single-context**: one `CONTEXT.md` + `docs/adr/` at the repo root.

虽然是 monorepo（`apps/server`、`apps/console`、`apps/public`、`packages/*`），但 `AGENTS.md` 合同把整个项目视为一个内聚整体，共享一套词汇表（runtime / adapter / surface / feature / schema / migration 等）。术语统一沉淀在根 `CONTEXT.md`，`apps/*` 和 `packages/*` 下**不**另立 `CONTEXT.md` 或 `docs/adr/`。

结构：

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-<decision>.md
│   └── 0002-<decision>.md
├── apps/
│   ├── server/
│   ├── console/
│   └── public/
└── packages/
    ├── runtime/
    ├── db/
    ├── cache/
    ├── file-storage/
    └── domain/
```

如果未来某个 app（例如 `apps/public` 的 SSR/HTML 领域）出现明显与其他部分不同的领域语言，再通过 `/domain-modeling` 拆成多 context（根 `CONTEXT-MAP.md` + 各 context 自己的 `CONTEXT.md`）。

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
