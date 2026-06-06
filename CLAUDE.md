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

### Documents + Research (Phase 3) — `src/features/documents/`

Living documents with version history and RAG embedding; iterative deep research loop.

- **`lib/document.functions.ts`** — CRUD server functions; auto-embeds content for RAG on save
- **`components/DocumentEditor.tsx`** — CodeMirror 6 editor with markdown support, 2s autosave, version tracking
- **`components/DocumentList.tsx`** — sidebar list with create/delete

Routes:
- `/_authenticated/documents` — split-pane document library + editor
- `/_authenticated/research` — question input, SSE progress log, streaming markdown report
- `/api/research/stream` — SSE POST handler using `runResearch()`

**`src/lib/research.server.ts`** — `runResearch()` async generator: Plan → Search (parallel) → Synthesize → Evaluate → repeat (up to 5 rounds). Yields `ResearchChunk` events (`progress`, `report`, `done`, `error`).

### Email + Calendar (Phase 4) — `src/features/email/`, `src/features/calendar/`

IMAP/SMTP email client and CalDAV calendar integration.

- **`src/lib/imap.server.ts`** — `listMessages`, `fetchMessage` via imapflow. Passwords encrypted at rest.
- **`src/lib/smtp.server.ts`** — `sendMail` via nodemailer.
- **`src/lib/caldav.server.ts`** — `syncCalDav` via tsdav + ical.js.
- **`src/features/email/lib/email.functions.ts`** — `getEmailAccounts`, `createEmailAccount`, `deleteEmailAccount`, `listEmails`, `getEmail`, `sendEmail`
- **`src/features/calendar/lib/calendar.functions.ts`** — `getCalendars`, `createCalendar`, `deleteCalendar`, `getEvents`, `createEvent`, `updateEvent`, `deleteEvent`, `syncCalendar`

Routes:
- `/_authenticated/email` — inbox list, read pane, compose modal, add account dialog
- `/_authenticated/calendar` — month-view grid, create/delete events, legend

### Scheduled Tasks + Compare + PWA (Phase 5)

Scheduled LLM tasks and model comparison.

- **`src/lib/scheduler.server.ts`** — `initScheduler()` (node-cron, polls every minute), `computeNextRun()`, `executeTask()`. Initialised via side-effect import in `src/lib/startup.server.ts` which is imported from `api/chat/stream.tsx`.
- **`src/features/tasks/lib/task.functions.ts`** — `getTasks`, `createTask`, `updateTask`, `deleteTask`, `runTaskNow`, `getTaskRuns`
- Schedules: `once`, `daily`, `weekly`, `monthly`, `cron` (cron expression).
- `/api/compare/stream` — SSE POST, streams a single `streamLLM` response for one (endpoint, model) pair.

Routes:
- `/_authenticated/tasks` — task list, create dialog, pause/resume/delete, run-now
- `/_authenticated/compare` — 2-4 model slots, parallel SSE streams, side-by-side markdown, blind mode

**PWA:** `public/manifest.json` + `public/sw.js` (cache-first static, network-first HTML, skip `/api/`). SW registered via `ServiceWorkerRegistrar` in `__root.tsx`.

### Theme + Settings + Gallery + Admin (Phase 6)

- **`src/features/theme/ThemeProvider.tsx`** — `ThemeProvider`, `useTheme()`. Applies `.theme-<name>` class to `<html>` and persists to localStorage. Themes: `default`, `ocean`, `forest`, `rose`, `midnight`. CSS variables live in `src/lib/globals.css`.
- **`/_authenticated/settings`** — tabbed settings: Account (profile, sign-out), Providers (endpoint CRUD), Theme (color picker).
- **`/_authenticated/gallery`** — drag-and-drop file upload to `public/uploads/`; image grid with lightbox; `/api/gallery/upload` POST handler.
- **`/_authenticated/admin`** — system stats (users, sessions, messages, memories) + user list.

## Testing

Tests live next to the files they test (e.g. `crypto.server.test.ts` next to `crypto.server.ts`). Test setup is in `src/test/setup.ts`. The `vitest.config.ts` uses jsdom environment with `@testing-library/jest-dom` matchers.

Write tests that describe what the component **should do**, not implementation details. A failing test means something is broken.

## Current State & AI Continuation

**All 6 phases are fully implemented.** The codebase is a complete self-hosted AI workspace. See the Features sections above for what each phase covers.

### Branch status (as of 2026-06-06)

| Branch | Status | Notes |
|--------|--------|-------|
| `main` | Phase 1 (chat core) | Only working, merged code lives here |
| `feat/agent-memory` | Open PR | Phase 2 — agent loop + vector memory |
| `feat/docs-research` | Open PR | Phase 3 — documents + deep research |
| `feat/email-calendar` | Open PR | Phase 4 — IMAP/SMTP + CalDAV |
| `feat/tasks-compare-pwa` | Open PR | Phase 5 — scheduled tasks + compare + PWA |
| `feat/polish` | Open PR | Phase 6 + cross-cutting improvements |
| `feat/notes-contacts-presets` | Merged | Phase 7 — Notes, Contacts, Presets + enhancements |
| `feat/skills-voice` | Open PR | Phase 8 — Skills management + Voice I/O |
| `feat/backup-stt` | Open PR | Phase 9 — Data backup/restore + server-side STT |

**To merge:** the PRs must be merged in order (each depends on the previous). Use the GitHub UI or `gh pr merge` if the CLI is available.

### Phase 7 — Notes, Contacts, Presets & Enhancements `feat/notes-contacts-presets`

Cross-cutting improvements on top of Phase 6:

- **RAG injection** (`src/routes/api/chat/stream.tsx`) — embeds user message, queries `Document.embedding` via pgvector cosine similarity (threshold 0.5, top 3) when `ragEnabled` is set on a session.
- **Context compaction** (`src/lib/compactor.server.ts`) — port of `context_compactor.py`. Summarizes history when token estimate exceeds 85% of model context window.
- **Auto session naming** — LLM names each new session after the first exchange; emits `session_name` SSE event.
- **Webhooks** (`src/features/webhooks/`) — outgoing webhooks with HMAC-SHA256 signing, SSRF protection, event filtering. Managed in Settings → Webhooks.
- **Message search** — full-text ILIKE search across all sessions; search icon in sidebar.
- **API tokens** (`src/features/tokens/`, `src/lib/token.server.ts`) — `ody_` prefix, SHA-256 hash stored. Managed in Settings → API Tokens.
- **Session auto-archive** — node-cron daily at 03:00 archives sessions inactive 7+ days.
- **Session fork** — branch any conversation; Fork action in sidebar dropdown.
- **Chat export** — download as Markdown or JSON; download icon in ChatView header.
- **System prompt presets** (`src/features/chat/lib/preset.functions.ts`) — save/load named presets. Managed in Settings → Presets; picker shown inline in session settings panel.
- **Expanded admin stats** — notes, contacts, webhooks, documents counts.
- **Agent tools** (`src/lib/tools/`) — `manage_notes`, `manage_contacts`, `manage_calendar`, `manage_tasks`, `manage_documents`, `search_chats` — 8 tools total wired into `agent.server.ts`.

### How to continue iterating

1. Check out `feat/polish` (or the latest unmerged branch) and keep improving the codebase.
2. Run `npm run check && npm run build && npx vitest run` — all must pass before any commit.
3. Run `npm run fix` before every commit. Never use `biome-ignore` suppressions — fix the actual lint issue.
4. Commit small and focused: one logical change per commit, format `feat(<scope>): <what>`.
5. Push to the open PR branch and let the user merge via GitHub.

### Non-negotiable coding rules

- **Zod v4:** import from `"zod/v4"`. Use `z.uuid()` not `z.string().uuid()`.
- **`createServerFn`:** use `.inputValidator()` not `.validator()`.
- **Prisma IDs:** `@default(uuid(7))` for all new models (UUIDv7 — time-sortable).
- **`routeTree.gen.ts`:** auto-generated by TanStack Router. Never edit manually; run `npm run dev` briefly after adding new route files to regenerate.
- **`LLMMessage.content`:** type is `string | LLMContentBlock[]` — never `null`.
- **Biome:** tabs, 100-char line width. Fix `noPrecisionLoss`, `noUnusedVariables`, `useSemanticElements`, `noLabelWithoutControl`, `useKeyWithClickEvents` warnings rather than suppressing.
- **Server-only imports:** files suffixed `.server.ts` must not be imported from client-only code. TanStack Start enforces this via tree-shaking.
- **No backward-compat shims:** delete dead code; don't add re-exports or `// removed` comments.

### Known good patterns

```ts
// createServerFn with validation
export const myFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.uuid(), name: z.string().min(1) }))
  .handler(async ({ data }) => { ... });

// SSE ReadableStream handler
const readable = new ReadableStream({
  async start(controller) {
    const enc = new TextEncoder();
    const send = (d: Record<string, unknown>) =>
      controller.enqueue(enc.encode(`data: ${JSON.stringify(d)}\n\n`));
    try { /* ... */ send({ type: "done" }); }
    catch (err) { send({ type: "error", error: (err as Error).message }); }
    finally { controller.close(); }
  },
});
return new Response(readable, {
  headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache",
             "Connection": "keep-alive", "X-Accel-Buffering": "no" },
});

// Prisma with pgvector raw query
await prisma.$executeRawUnsafe(
  `UPDATE "Memory" SET embedding = $1::vector WHERE id = $2`,
  toVectorLiteral(embedding), id,
);

// Vitest timer fakes (scheduler tests)
vi.useFakeTimers({ now: new Date("2026-01-15T10:00:00Z") });
afterEach(() => vi.useRealTimers());
```

### Phase 9 — Backup/Restore + Server-side STT  `feat/backup-stt`

- **Data export** (`GET /api/backup/export`) — downloads a dated JSON file with all user data: memories, notes, contacts, skills, presets, recent 50 chat sessions (capped at 200 messages each), non-archived documents.
- **Data import** (`POST /api/backup/import`) — parses backup JSON and inserts records non-destructively alongside existing ones. Chat sessions intentionally excluded from import (too complex to deduplicate). Settings → Data tab.
- **Server-side STT** (`POST /api/stt/transcribe`) — accepts audio via `multipart/form-data`, forwards to the user's configured endpoint's `/v1/audio/transcriptions` (Whisper-compatible). Returns `{ text }`. Complements the browser Web Speech API from Phase 8.

### Potential next improvements (ideas, not required)

- **ModelPicker no-endpoint hint:** only `ChatView` shows the "add a provider in Settings" link — `ModelPicker` could also show it when the endpoint list is empty.
- **Gallery crop/resize:** the gallery upload works but has no client-side image editing. A `<canvas>`-based crop dialog would complete Phase 6.
- **More unit tests:** `agent.server.ts`, `imap.server.ts` stubs, and `llm.server.ts` response parsing all lack coverage.
- **Rate limiting:** the chat stream API has no rate limiting; consider per-user token-bucket limiting to protect against abuse.
- **Preset sharing:** presets are private per-user; a "share preset" link or public preset gallery would be useful.
- **Note reminders:** `Note.dueDate` is stored but no notification mechanism fires — wire up a scheduler cron job or browser notification at due time.
