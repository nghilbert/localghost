# CLAUDE.md

Guidance for Claude Code working in this repository.

## Project Purpose

A ground-up TypeScript reimplementation of [Odysseus](https://github.com/pewdiepie-archdaemon/odysseus). Goal: feature parity — chat, agent, cookbook, research, notes, tasks, memory, skills — with cleaner architecture and better UX. Treat `../odysseus/` as the behavior reference, but improve on it rather than porting verbatim.

## Commands

```bash
npm run dev          # dev server on :3000
npm run build        # type-check + production build
npm run check        # biome lint + format check
npm run fix          # biome auto-fix
npx vitest run       # run tests once
npm run prisma -- migrate dev --name <name>
npm run prisma -- generate
```

**Inner dev loop:** `docker compose up db -d` then `npm run dev`.

## Environment

Copy `.env.example` to `.env`. Required: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ENCRYPTION_KEY` (64-char hex). Optional: `SEARXNG_URL` (falls back to DuckDuckGo).

## Architecture

- **Framework:** TanStack Start (SSR React, Vite + Hono); file-based routing. `src/routeTree.gen.ts` is generated — never edit. Import alias `#/` → `src/`.
- **Routes:** `_authenticated.tsx` guards auth and renders the `AppSidebar` shell. Route files under `_authenticated/` are thin — `Route` export + one page component, no inline sub-components.
- **Auth:** better-auth (email/password). Session resolved at root `beforeLoad`.
- **Data:** TanStack Query + `createServerFn` in co-located `*.functions.ts`. Call as `fn({ data: { ... } })`.
- **Database:** Prisma 7 + `@prisma/adapter-pg`. Multi-file schema in `prisma/schema/`. Generated client in `src/generated/prisma/`. Import `prisma` — never alias.
- **Styling:** Tailwind v4. `src/lib/globals.css` is the single CSS entry. Light/dark via `.dark` on `<html>`. `cn()` in `src/lib/utils.ts`.
- **LLM:** `src/lib/llm.server.ts` — `streamLLMEvents()` → `AsyncIterable<StreamChunk>`, `callLLM()` non-streaming. Provider auto-detected from URL. Both wrap `@tanstack/ai`'s `chat()`.
- **Agent:** `src/lib/agent.server.ts` — `runAgentEvents()` returns the same event stream with built-in tools auto-executed up to 10 rounds. Built-in tools: `web_search`, `manage_*`, `search_chats`, plus MCP tools as `mcp__<slug>__<tool>`.
- **Chat persistence:** one `Conversation` row = one `UIMessage[]` blob (`messages` JSONB). The **client** owns persistence via `ChatClientPersistence` (`src/features/chat/lib/chat-persistence.ts`), so `/api/chat/stream` performs **zero DB writes**. `saveMessagesInput` accepts `z.array(z.record(z.string(), z.unknown()))` — never re-declare the framework's `UIMessage` shape. Sidebar filters `mode: { not: "compare" }` so ephemeral compare rows stay invisible.
- **Encryption:** AES-256-GCM (`src/lib/crypto.server.ts`), format `iv:tag:ciphertext` (hex). Stores API keys and webhook secrets at rest.
- **Embeddings:** pgvector `vector(1536)` IVFFlat cosine on `Memory`; raw queries via `prisma.$queryRawUnsafe`.
- **Scheduler:** `src/lib/scheduler.server.ts`, initialized via side-effect import `#/lib/startup.server`.
- **Markdown:** rendered with `streamdown` (`<Streamdown>` via `src/components/Markdown/`). Streaming-safe; no rich-text editor.

## Forms

`useAppForm` (TanStack Form) in `src/hooks/use-app-form.ts`. Field components in `src/components/appForm/` — never hand-wire `useState`-per-field + `Input` for submit forms. Validate with Zod v4 via `validators: { onDynamic: Schema }`. Submit via `form.handleSubmit()`. Need a new field type? Add a field component — don't hand-wire.

## Code Organization

```
src/features/<name>/
  components/   # feature-specific UI
  hooks/        # use-*.ts
  lib/          # *.functions.ts server fns, types, constants
```

- Large components (250+ lines or with sub-components) become `ComponentName/index.tsx` folders.
- File suffixes: `*.functions.ts` (server fns), `*.server.ts` (server-only), `*.client.ts` (client-only). Type files: `types.ts`.
- `src/components/ui/` — shadcn primitives, never edit by hand; regenerate via `npx shadcn add <component> --overwrite`.
- `src/components/DataTable/` — the only table implementation; never hand-roll `useReactTable`.
- Tests in `src/test/<area>/`; write for new pure logic and non-trivial UI behavior.

## Git & SDLC

- Branch from `main`: `feat/`, `fix/`, `refactor/`, `chore/`. PR title ≤70 chars, imperative.
- **Before every commit:** `npm run fix` → `npm run check` → `npx vitest run` → `npm run build`.
- **Compaction checkpoints:** mark `🛑 STOP — compaction checkpoint` in plans at natural phase boundaries; pause so the user can compact before continuing.

## Non-negotiable Rules

- **Do it right, WORK WITH THE FRAMEWORK:** never hand-roll what a modern dependency already does, and never try to out-engineer it with a parallel/“better” implementation, bridge, or compatibility shim. Adopt the library’s native model end-to-end (its types, persistence shape, helpers) even when that means a larger diff or a schema migration — the count of changed files is irrelevant. Doing it right almost always simplifies; if a workaround is growing to preserve an older shape, delete the older shape instead.
- **shadcn-first:** before building UI, find the shadcn component that fits (consult the MCP registry). Compose primitives; never raw HTML where a shadcn equivalent exists. The UI must stay themeable via CSS variables only — no hardcoded colors.
- **Prisma:** app model IDs `@default(dbgenerated("gen_random_uuid()")) @db.Uuid`; auth-table IDs `@id @db.Uuid` with no `@default`; all FKs `@db.Uuid`; all camelCase fields `@map("snake_case")`.
- **Biome:** tabs, 100-char width; fix all warnings, never `biome-ignore`.
- **Server-only:** never import `.server.ts` from client code.
- **Comments:** only for non-obvious behavior; JSDoc on exported functions when the signature isn't self-explanatory. Describe what the code is and does (`@param`/`@returns`) — never narrate PR or changelog history.
- **No `as` casts:** type correctly via generics, annotations, or Prisma model types. `as` is a last resort for genuinely untyped external data.
- **No dead code:** delete unused code; no re-exports, no `// removed` comments.
- **Components own their styling.** `<div className="rounded-lg border bg-card p-4">` is always wrong — that's `<Card>`. Use sub-components. Reach for `className` only for layout the component can't do itself. Never add wrapper divs or custom classes to preserve visual parity with an older design.
- **Layout-agnostic components:** reusable components never set their own width, max-width, or margins — the parent owns layout.
- **Post-action toasts:** after user-awaited mutations, fire `toast.success` / `toast.error` from `sonner`.



// pgvector (snake_case column names — no quoted identifiers)
await prisma.$executeRawUnsafe(
  `UPDATE memory SET embedding = $1::vector WHERE id = $2`,
  toVectorLiteral(embedding), id,
);
```

## Feature Map

| Area | Key files |
|------|-----------|
| Chat + streaming | `src/features/chat/` (`conversation.functions.ts`, `chat-persistence.ts`), `src/routes/api/chat/stream.tsx` |
| Model compare | `src/features/compare/` — `Conversation` rows (`mode="compare"`), `useChat` per slot, in-memory persistence, reuses `/api/chat/stream` |
| Cookbook | `src/features/cookbook/`, `src/routes/api/cookbook/pull.tsx`, `src/lib/hardware.server.ts` |
| Endpoints / providers | `src/features/endpoints/` — shared `ModelEndpoint` table |
| Memory (pgvector) | `src/features/memory/`, `src/lib/tools/manage_memory.ts` |
| Scheduled tasks | `src/features/tasks/`, `src/lib/scheduler.server.ts` |
| Skills | `src/features/skills/` |
| Notes | `src/features/notes/` |
| Webhooks | `src/features/webhooks/` — HMAC-SHA256, SSRF protection |
| MCP servers | `src/lib/mcp.server.ts`, `src/features/mcp/` |
| Settings | `src/features/settings/components/` |
| Backup/import | `src/routes/api/backup/` — non-destructive merge |
| Context compaction | `src/lib/compactor.server.ts` — summarizes at 85% token limit |
| Auth | `src/features/auth/` |
| Theme | `src/features/theme/` |
