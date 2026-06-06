# CLAUDE.md

## Commands

```bash
npm run dev          # start dev server on :3000
npm run build        # type-check + production build
npm run check        # biome lint + format check
npm run fix          # biome auto-fix (lint + format)
npx vitest run       # run tests once
npm run prisma -- migrate dev --name <name>
npm run prisma -- generate
```

Start Postgres: `docker compose up db -d`

## Environment

Copy `.env.example` to `.env`. Required: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ENCRYPTION_KEY` (64-char hex — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).

Optional: `SEARXNG_URL` (falls back to DuckDuckGo).

## Architecture

**Framework:** TanStack Start (SSR React, Vite + Hono). File-based routing via TanStack Router. `src/routeTree.gen.ts` is auto-generated — never edit manually; run `npm run dev` after adding routes.

**Auth:** better-auth with email/password. Server: `src/features/auth/lib/auth.server.ts`. Client: `src/features/auth/lib/auth-client.ts`. Session in React Query under `["session"]`.

**Data fetching:** TanStack Query + `createServerFn`. Use `.inputValidator()` (not `.validator()`).

**Database:** Prisma 7 with `@prisma/adapter-pg`. Schema in `prisma/schema/` (multi-file). Generated client in `src/generated/prisma/`. All IDs: `@default(uuid(7))`.

**Forms:** `src/hooks/appForm.tsx` — `useAppForm` with `InputField`, `PasswordField`, `SubmitButton`. Use this for all new forms.

**UI:** shadcn/ui in `src/components/ui/`. Add with `npx shadcn add <component>`. App-level components in `src/components/`.

**Styling:** Tailwind v4 (Vite plugin). Biome: tabs, 100-char line width. `src/lib/globals.css` is the single CSS entry.

**Import alias:** `#/` → `src/`

**Validation:** Zod v4 from `"zod/v4"`. Use `z.uuid()` not `z.string().uuid()`.

**Encryption:** AES-256-GCM via `src/lib/crypto.server.ts`. Format: `iv:tag:ciphertext` (hex).

**LLM:** `src/lib/llm.server.ts` — `streamLLM()` → `ReadableStream<SSEChunk>`. Providers auto-detected from URL: OpenAI, Anthropic, Ollama, OpenRouter, Groq.

**Agent:** `src/lib/agent.server.ts` — `runAgent()` async generator, up to 10 tool-use rounds. Accepts `mcpTools?: McpToolDef[]`.

**Embeddings:** `src/lib/embeddings.server.ts` — tries each endpoint's `/v1/embeddings`. Returns `null` on failure (callers fall back to keyword search).

**Vector search:** pgvector on `memory` table. `vector(1536)`, IVFFlat cosine index. Raw queries via `prisma.$queryRawUnsafe`. Docker: use `pgvector/pgvector:pg16`.

## Non-negotiable Rules

- **Zod v4:** `z.uuid()` not `z.string().uuid()`
- **`createServerFn`:** `.inputValidator()` not `.validator()`
- **Prisma IDs:** `@default(uuid(7))`
- **`LLMMessage.content`:** `string | LLMContentBlock[]` — never `null`
- **Biome:** fix warnings, never use `biome-ignore`; run `npm run fix` before every commit
- **Server-only:** `.server.ts` files must not be imported from client code
- **No dead code:** delete unused code; no re-exports or `// removed` comments

## Known Good Patterns

```ts
// createServerFn
export const myFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.uuid(), name: z.string().min(1) }))
  .handler(async ({ data }) => { ... });

// SSE handler
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

// pgvector raw query
await prisma.$executeRawUnsafe(
  `UPDATE "Memory" SET embedding = $1::vector WHERE id = $2`,
  toVectorLiteral(embedding), id,
);
```

## Testing

Tests live next to their source files. Setup in `src/test/setup.ts`. jsdom + `@testing-library/jest-dom`.

## Features

All phases are implemented. `main` has everything through Phase 7 merged. Phases 10–11 are open PRs.

### What's in the codebase

| Area | Key files |
|------|-----------|
| Chat + streaming | `src/features/chat/`, `src/routes/api/chat/stream.tsx` |
| Memory (pgvector) | `src/features/memory/`, `src/lib/tools/manage_memory.ts` |
| Documents + RAG | `src/features/documents/`, `src/lib/research.server.ts` |
| Email (IMAP/SMTP) | `src/features/email/`, `src/lib/imap.server.ts`, `src/lib/smtp.server.ts` |
| Calendar (CalDAV) | `src/features/calendar/`, `src/lib/caldav.server.ts` |
| Scheduled tasks | `src/features/tasks/`, `src/lib/scheduler.server.ts` |
| Model compare | `src/routes/_authenticated/compare.tsx` |
| PWA | `public/manifest.json`, `public/sw.js` |
| Theme | `src/features/theme/ThemeProvider.tsx` |
| Settings | `src/routes/_authenticated/settings.tsx` (tabs: Account, Providers, Theme, Webhooks, API Tokens, Presets, MCP, Data) |
| Gallery | `src/routes/_authenticated/gallery.tsx` |
| Admin | `src/routes/_authenticated/admin.tsx` |
| Notes | `src/features/notes/`, agent tool: `manage_notes` |
| Contacts | `src/features/contacts/`, agent tool: `manage_contacts` |
| Presets | `src/features/chat/lib/preset.functions.ts` |
| Webhooks | `src/features/webhooks/` — HMAC-SHA256, SSRF protection |
| API tokens | `src/features/tokens/`, `src/lib/token.server.ts` (`ody_` prefix) |
| MCP servers | `src/lib/mcp.server.ts`, `src/features/mcp/` — namespaced `mcp__slug__tool` |
| Backup/import | `src/routes/api/backup/` — non-destructive merge |
| STT proxy | `src/routes/api/stt/transcribe.tsx` → Whisper endpoint |
| Diagnostics | `src/routes/api/diagnostics/` |
| Voice I/O | `MicButton` (Web Speech API), `SpeakButton` (speechSynthesis) |
| Skill injection | Top-5 skills appended to system prompt per request |
| Agent tools (8) | `web_search`, `manage_memory`, `manage_notes`, `manage_contacts`, `manage_calendar`, `manage_tasks`, `manage_documents`, `search_chats` |
| Context compaction | `src/lib/compactor.server.ts` — summarizes at 85% token limit |
| Auto session naming | LLM names session after first exchange; `session_name` SSE event |
| Session fork | Branch any conversation with full history |
| Chat export | Markdown or JSON download |
| Message search | Full-text ILIKE across all sessions |

### Branch status

| Branch | Status |
|--------|--------|
| `main` | Phases 1–7 merged |
| `feat/backup-stt-diagnostics` | In progress — Phase 11 |
| Coninuasly iterate through an SDLC to copy over the core functions of @odysseus/ into our project with better more scaleable practices |

### Potential next improvements

- **Skills UI** — `/skills` route with split-pane editor; `manage_skills` agent tool (`Skill` model exists)
- **Note reminders** — `Note.dueDate` stored but no cron/notification fires
- **Rate limiting** — no per-user limits on the chat stream endpoint
- **More tests** — `agent.server.ts`, `llm.server.ts` parsing, `imap.server.ts` stubs lack coverage
- **Gallery crop/resize** — upload works; no client-side `<canvas>` editor yet
