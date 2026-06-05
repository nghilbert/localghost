# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start dev server on :3000
npm run build        # type-check + production build
npm run check        # biome lint + format check
npm run fix          # biome auto-fix (lint + format)
npm run lint         # biome lint only
npm run format       # biome format only
npx vitest           # run tests (watch mode)
npx vitest run       # run tests once
npx vitest run path/to/file.test.ts  # run a single test file
npm run prisma -- migrate dev --name <name>   # create a migration
npm run prisma -- migrate deploy              # apply migrations
npm run prisma -- generate                    # regenerate client
```

Start the local Postgres DB with `docker compose up db -d` before running `npm run dev`.

## Environment

Copy `.env.example` to `.env`. Required vars: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ENCRYPTION_KEY`. The docker-compose `db` service uses `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`.

`ENCRYPTION_KEY` must be a 64-character hex string (32 bytes). Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## Architecture

**Framework:** TanStack Start (SSR React, built on Vite + Hono). `vite.config.ts` wires up `@tanstack/react-start`, Tailwind v4, and React plugins.

**Routing:** File-based via TanStack Router. `src/routeTree.gen.ts` is auto-generated — never edit it manually. Route layout:
- `__root.tsx` — HTML shell, `QueryClientProvider`, fetches session in `beforeLoad` via `authQueryOptions()`
- `_authenticated.tsx` — redirects to `/sign-in` if no session; renders `AppSidebar` + `SidebarInset`
- `_public.tsx` — unauthenticated pages (sign-in, sign-up)
- `api/auth/$.tsx` — catch-all route that delegates GET/POST to the better-auth handler
- `api/chat/stream.tsx` — SSE streaming POST handler for chat messages

**Auth:** [better-auth](https://better-auth.com) with email/password. Server instance in `src/features/auth/lib/auth.server.ts` (server-only, lazy-imported in server functions). Client in `src/features/auth/lib/auth-client.ts`. Session is fetched by a `createServerFn` in `auth.functions.ts` and stored in React Query under key `["session"]`.

**Data fetching:** TanStack Query for client-side caching. Server data is fetched via `createServerFn` (TanStack Start) — these run only on the server and are callable from the client like async functions. Validator chains use `.inputValidator()` (not `.validator()`).

**Database:** Prisma 7 with the `@prisma/adapter-pg` driver adapter (no connection pooling middleware needed). Schema lives in `prisma/schema/` (multi-file). Generated client outputs to `src/generated/prisma/`. Singleton pattern in `src/lib/db.server.ts` prevents hot-reload connection leaks. All IDs use `@default(uuid(7))` (UUIDv7 — time-sortable).

**Forms:** `src/hooks/appForm.tsx` exports `useAppForm` (built on TanStack Form) with pre-wired `InputField`, `PasswordField`, and `SubmitButton` components. Use this instead of raw TanStack Form for any new forms.

**UI components:** shadcn/ui in `src/components/ui/`. Add new components with `npx shadcn add <component>`. Semantic custom primitives in `src/components/ui/custom/` (e.g. `ChatBubble`, `ChatFeed`). Custom app-level components go in `src/components/`.

**Styling:** Tailwind CSS v4 (PostCSS-free, Vite plugin). Biome is the formatter/linter (tabs, 100-char line width). `src/lib/globals.css` is the single CSS entry point.

**Before every commit:** run `npm run fix` from the project root to auto-fix lint and format issues. Do not use `biome-ignore` suppression comments except on generated files — fix the actual issue instead.

**Import alias:** `#/` resolves to `src/` (configured in `package.json` `imports` and `tsconfig.json`).

**Validation:** Zod v4 (imported from `"zod/v4"`). Use `z.uuid()` (not `z.string().uuid()`) for UUID fields.

**Encryption:** AES-256-GCM via `src/lib/crypto.server.ts`. Format: `iv(hex):tag(hex):ciphertext(hex)`. Used to store API keys at rest.

**LLM streaming:** `src/lib/llm.server.ts` provides `streamLLM()` returning a `ReadableStream<SSEChunk>`. Supports OpenAI, Anthropic, Ollama, OpenRouter, Groq — auto-detected from the endpoint URL via `detectProvider()`.

**Agent loop:** `src/lib/agent.server.ts` exports `runAgent()`, an async generator that runs up to 10 rounds of: stream LLM with tools → collect tool calls → execute tools → inject results → repeat. Yields `AgentChunk` (same as `SSEChunk` plus `{ type: "tool_result" }` events).

**Embeddings:** `src/lib/embeddings.server.ts` tries each configured endpoint's `/v1/embeddings` API in order. Returns `null` when none available — callers fall back to keyword search.

**Vector search:** pgvector extension on the `memory` table. Column type `vector(1536)`. IVFFlat index for cosine similarity. Raw queries via `prisma.$queryRawUnsafe`.

**Docker:** use `pgvector/pgvector:pg16` (not `postgres:16`) so the `vector` extension is available.

**Optional env vars:**
- `SEARXNG_URL` — point to a local SearXNG instance; falls back to DuckDuckGo Instant Answer API.

## Features

### Chat (Phase 1) — `src/features/chat/`

Multi-provider chat with SSE streaming, session management, and model picker.

- **`lib/schemas.ts`** — Zod schemas for endpoints and sessions
- **`lib/chat.functions.ts`** — `createServerFn` wrappers for CRUD; exports `endpointsQueryOptions()`, `sessionsQueryOptions()`, `sessionQueryOptions(id)`
- **`components/ChatView.tsx`** — main chat view; streams from `/api/chat/stream`; uses `key={session.id}` on the parent so remounting resets state when navigating between sessions
- **`components/ChatMessage.tsx`** — renders a single message; uses `senderRole` prop (not `role`) to avoid conflict with ARIA attributes; user messages are plain text, assistant messages are ReactMarkdown
- **`components/ChatInput.tsx`** — auto-resize textarea; Enter submits, Shift+Enter newline; shows stop button during streaming
- **`components/ModelPicker.tsx`** — dropdown; fetches available models per endpoint with 30s stale time
- **`components/SessionList.tsx`** — sidebar list; double-click to rename; archive action
- **`components/EndpointDialog.tsx`** — add/delete LLM provider endpoints

Routes:
- `/_authenticated/` — home page, creates session and redirects
- `/_authenticated/sessions/$sessionId` — loads session, renders `<ChatView key={session.id} />`
- `/api/chat/stream` — POST SSE handler; branches on `session.mode === "agent"` to call `runAgent` or `streamLLM`; persists messages; handles abort

### Memory (Phase 2) — `src/features/memory/`

Persistent user memories with vector similarity search.

- **`lib/memory.functions.ts`** — `getMemories`, `addMemory`, `deleteMemory`, `searchMemories` server functions
- **`components/MemoryModal.tsx`** — Dialog UI for browsing, adding, searching, and deleting memories

Agent tools in `src/lib/tools/`:
- **`web_search.ts`** — queries SearXNG (`SEARXNG_URL` env) or DuckDuckGo Instant Answer API
- **`manage_memory.ts`** — add/search/list/delete memories; uses vector similarity when embeddings available

## Testing

Tests live next to the files they test (e.g. `crypto.server.test.ts` next to `crypto.server.ts`). Test setup is in `src/test/setup.ts`. The `vitest.config.ts` uses jsdom environment with `@testing-library/jest-dom` matchers.

Write tests that describe what the component **should do**, not implementation details. A failing test means something is broken.
