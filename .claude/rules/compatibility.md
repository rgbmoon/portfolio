---
paths:
  - "apps/api/**"
  - "packages/contracts/**"
---

# Backward compatibility and migrations (CLAUDE.md section 6.6)

Web and api are deployed independently: a monorepo commit is atomic, a deploy is not. For some time the new version of
one part runs against the old version of the other.

- Change the API by expand/contract: add a new field or endpoint, switch the client to it, and remove the old one only
  after the client is deployed.
- Do not remove or rename fields and endpoints in one step. A breaking change goes only through a new version
  (`/api/v2`) or a phased migration.
- The same rule applies to the WebSocket protocol: a new envelope version is supported in parallel with the old one
  until clients update.
- **DB migrations:**
  - A migration during a deploy must not break the previous api version that is still running.
  - Since Prisma 7.4, the statements of a multi-statement PostgreSQL migration are committed separately: a failed
    migration leaves the DB half-applied. Therefore one migration holds one logical change, and destructive steps go
    into a separate contract phase. Check the 7.x changelog before adopting.
  - Expand/contract for a column: nullable column → code writes to both fields → backfill by a job → `NOT NULL` →
    removal of the old column.
  - Indexes on large tables — `CREATE INDEX CONCURRENTLY` in a separate migration.
  - A backup before `migrate deploy`.
  - Migrations are applied by a one-off container before traffic switches; api startup does not apply them.
  - Prisma performs a move of a model between schemas as dropping and creating the table — data is moved manually by an
    SQL migration.
- **Automated checks:**
  - squawk — SQL migration linter;
  - `prisma migrate diff` — drift detection;
  - `openapi.json` is committed, `oasdiff breaking` compares it with main;
  - for WS — a snapshot test of the envelope JSON Schema.
