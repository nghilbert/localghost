# CLAUDE.md

Guidance for Claude Code working in this repository.

## Non-negotiable Rules

- **Simplicity is the fix, NOT more complexity:** when you feel friction creating a function or component, you are thinking too hard. Remove divs and unnecessary nesting. Reduce complexity — the problem will disappear or become obvious. Adding more always makes things more complicated.
- **Do it right, WORK WITH THE FRAMEWORK:** never hand-roll what a modern dependency already does. Never build a parallel/"better" implementation, bridge, or shim. Adopt the library's native model end-to-end (its types, persistence shape, helpers) even when that means a larger diff — the file count is irrelevant. Doing it right almost always simplifies.
- **shadcn-first:** before building UI, find the shadcn component that fits (consult the MCP registry). Compose primitives; never raw HTML where a shadcn equivalent exists. The UI must stay themeable via CSS variables only — no hardcoded colors.
- **Prisma:** app model IDs `@default(dbgenerated("gen_random_uuid()")) @db.Uuid`; auth-table IDs `@id @db.Uuid` with no `@default`; all FKs `@db.Uuid`; all camelCase fields `@map("snake_case")`.
- **Biome:** tabs, 100-char width; fix all warnings, never `biome-ignore`.
- **Server-only:** never import `.server.ts` from client code.
- **Comments:** only for non-obvious behavior; JSDoc on exported functions when the signature isn't self-explanatory. Describe what the code is and does — never narrate PR or changelog history.
- **No `as` casts:** type correctly via generics, annotations, or Prisma model types.
- **No dead code:** delete unused code; no re-exports, no `// removed` comments.
- **Components own their styling.** `<div className="rounded-lg border bg-card p-4">` is always wrong — that's `<Card>`. Use sub-components. Reach for `className` only for layout the component can't do itself.
- **Layout-agnostic components:** reusable components never set their own width, max-width, or margins — the parent owns layout.
- **Post-action toasts:** after user-awaited mutations, fire `toast.success` / `toast.error` from `sonner`.

## Project Purpose

A modern, local-first AI chat app: install whatever model you want (local via Ollama, or bring-your-own cloud endpoint) and chat with it — as simple and polished as the big brands, but yours. The **Library** is the core surface (browse and install models, then chat). Capabilities are **inline tools, never tabs**: web search, MCP servers, and a long-term **Memory** all live inside chat, toggled per message. Keep it simple and powerful; cut anything that doesn't serve that loop.

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

**Inner dev loop (fastest HMR):** `docker compose up db -d` then `npm run dev` — app native against a Dockerized Postgres.

**Full stack in Docker:** `COMPOSE_PROFILES=ollama,dev docker compose up --build` — the `dev` profile runs Vite with HMR over a bind mount (`web-dev` service); the `ollama` profile adds a bundled Ollama. `COMPOSE_FILE` overlays add GPU access; see `.env.example` / `README.md`.

## Environment

Copy `.env.example` to `.env`. Required: `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET`, `ENCRYPTION_KEY` (64-char hex). `DATABASE_URL` is a single `.env` line interpolated from `POSTGRES_*` by dotenvx; DB-touching scripts run through `dotenvx run`. Optional: `SEARXNG_URL` (falls back to DuckDuckGo).

## Architecture

- **Framework:** TanStack Start (SSR React, Vite + Hono); file-based routing. `src/routeTree.gen.ts` is generated — never edit. Import alias `#/` → `src/`.
- **Routes:** `_authenticated.tsx` guards auth and renders the `AppSidebar` shell. Route files under `_authenticated/` are thin — `Route` export + one page component, no inline sub-components. The component a route binds to is named `<RouteSubject>Page` (`LibraryPage`, `SettingsPage`, `ConversationPage`) — the subject is what the route renders, which equals the feature name only for single-route features. Sub-components the page composes keep their own descriptive names (`SignInForm`, `AccountTab`, `ChatView`).
- **Auth:** better-auth (email/password). Session resolved at root `beforeLoad`.
- **Data:** TanStack Query + `createServerFn` in co-located `*.functions.ts`. Call as `fn({ data: { ... } })`.
- **Database:** Prisma 7 + `@prisma/adapter-pg`. Multi-file schema in `prisma/schema/`. Generated client in `src/generated/prisma/`. Import `prisma` — never alias.
- **Styling:** Tailwind v4. `src/lib/globals.css` is the single CSS entry. Light/dark via `.dark` on `<html>`. `cn()` in `src/lib/utils.ts`.
- **LLM:** `src/lib/llm.server.ts` — `streamLLMEvents()` → `AsyncIterable<StreamChunk>` (pass a `ServerTool[]` to enable the agent loop), `callLLM()` non-streaming. A data-driven `PROVIDERS` registry handles per-provider URL/header/model-list/options quirks; provider auto-detected from URL. All wrap `@tanstack/ai`'s `chat()` with native adapters.
- **Tools:** `src/features/chat/lib/agent.server.ts` — `buildChatTools()` assembles the built-in `ServerTool[]` (web search, memory, skills, search chats) plus MCP server tools; `chat()` auto-executes them. There is **one** chat — no separate "agent mode". Every tool is **opt-in per request**: the client sends the selection via `forwardedProps` (not persisted), so an untouched send hands the model no tools — keeping small models reliable.
- **Chat persistence:** one `Conversation` row = one `UIMessage[]` blob (`messages` JSONB). The **client** owns persistence via `ChatClientPersistence` (`src/features/chat/lib/chat-persistence.ts`), so `/api/chat/stream` performs **zero DB writes**.

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

## Feature Map

| Area | Key files |
|------|-----------|
| Chat + streaming | `src/features/chat/` (`conversation.functions.ts`, `chat-persistence.ts`), `src/routes/api/chat/stream.tsx` |
| Library (core) | `src/features/library/`, `src/routes/api/library/pull.tsx`, `src/features/library/lib/hardware.server.ts` — browse/install local models (My Models, Browse) |
| Endpoints / providers | `src/features/endpoints/` — shared `ModelEndpoint` table |
| Memory (pgvector) | `src/lib/tools/manage_memory.ts`, `src/lib/tools/embeddings.server.ts` — opt-in per-message tool; browse/delete saved memories in Settings |
| Skills | `src/features/skills/` |
| MCP servers | `src/features/mcp/lib/tools.server.ts`, `src/features/mcp/` |
| Settings | `src/features/settings/components/` |
| Backup/import | `src/routes/api/backup/` — non-destructive merge |
| Context compaction | `src/features/chat/lib/compactor.server.ts` — summarizes at 85% token limit |
| Auth | `src/features/auth/` |
| Theme | `src/features/theme/` |
