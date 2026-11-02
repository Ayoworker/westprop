# Plotworks — MVP scaffold

Client portal + back-office for a land-sales and property-development company.
Next.js 15 (App Router) · TypeScript · Postgres 16 + Prisma · Auth.js v5 · Tailwind v4 · Claude API.

## Run it

Requires Node 20.12+ and Docker (or any Postgres 16).

```bash
cp .env.example .env          # then set AUTH_SECRET (npx auth secret)
npm install
npm run db:up                 # Postgres in Docker
npm run db:setup              # migrate → RLS/triggers → seed
npm run dev                   # http://localhost:3000
```

Seeded logins are listed at the top of `prisma/seed.ts` (password = `SEED_PASSWORD` in `.env`).

```bash
npm test                      # DB-level isolation + ledger integrity tests
npm run db:reset && npm run test:e2e   # Playwright, one flow per role
# No Playwright Chromium download? Use the system Edge: set PW_CHANNEL=msedge first.
# Hosting on Vercel + Supabase: see DEPLOY.md.
```

## How isolation works (read this before adding a table)

1. **Session → context.** `requireClient()` / `requireStaff()` build a `TenantContext` from the signed session only.
2. **App filter.** `src/lib/data/*` adds `clientAccountId` to every client query; other tenants' ids 404.
3. **Postgres RLS.** The app connects as `plotworks_app` (non-owner). `withTenant()` sets
   `app.role` / `app.client_account_id` per transaction; policies in
   `prisma/sql/001_rls_and_integrity.sql` deny everything else. A query outside `withTenant` sees nothing.

New project-scoped table? Add `clientAccountId`, then add it to the RLS and `project_tenant` trigger
lists in the SQL file, and a case in `tests/isolation.test.ts`.

## Ledger rules (enforced in the database)

- Entries are created `PENDING`, positive, and are immutable afterwards; no deletes.
- Only an ADMIN who did **not** create an entry can approve/flag it (maker-checker).
- `APPROVED` is final. Corrections are reversal entries (exact negative), which also need approval.
- Clients see `APPROVED` entries only; totals are always computed from entries.

## AI

`src/lib/ai/anomalies.ts` — deterministic flags (spend vs progress, slips, open failed checks, gates).
`src/lib/ai/summary.ts` — Claude (`claude-sonnet-5-5`) rephrases the snapshot + flags for the client.
The snapshot is built from data already loaded under the viewer's tenant context, cached in `AiInsight`
by input hash, and rendered only inside the purple "AI-generated" panel. Server-side refusal fallbacks
are enabled (`fallbacks: "default"`). Without `ANTHROPIC_API_KEY` the panel says "AI unavailable".

## What's in this slice / what's next

| Done | Not yet (Phase 1 remainder) |
|---|---|
| Client portal: switcher + all 7 tabs | Receipt upload + R2 signed URLs (`src/lib/storage.ts` stub → 503) |
| Admin: stage progress (gate-enforced, audited) | Admin CRUD for clients / plots / projects |
| Admin: ledger add / approve / flag / reverse | Milestone, check, compliance & material editors |
| RLS, append-only + ledger triggers, audit log | Audit log viewer page, rate limiting |
| AI summary + anomaly flags | AI Q&A over project data (Phase 2) |

Known MVP trade-offs: roles live in the JWT (8h expiry), so a role change applies at next sign-in.
Credentials login replaces magic links because email is out of scope this phase.
