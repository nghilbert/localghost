# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start dev server on :3000
npm run build        # type-check + production build
npm run check        # biome lint + format check
npm run fix          # biome auto-fix (lint + format)
npx vitest run       # run tests once
npx vitest run src/test/features/chat/chat.test.ts   # run a single test file
npm run prisma -- migrate dev --name <name>
npm run prisma -- generate
```

Start Postgres: `docker compose up db -d`

## Environment

Copy `.env.example` to `.env`. Required: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ENCRYPTION_KEY` (64-char hex — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).

Optional: `SEARXNG_URL` (falls back to DuckDuckGo).

## Architecture

**Framework:** TanStack Start (SSR React, Vite + Hono). File-based routing via TanStack Router. `src/routeTree.gen.ts` is auto-generated — never edit manually; run `npm run dev` after adding routes.

**Route layout:** `src/routes/__root.tsx` wraps the whole app (ThemeProvider, TooltipProvider, Toaster). `src/routes/_authenticated.tsx` guards all auth-required routes behind `better-auth` and renders the `AppSidebar` + `SidebarInset` shell.

**Auth:** better-auth with email/password. Server: `src/features/auth/lib/auth.server.ts`. Client: `src/features/auth/lib/auth-client.ts`. Session resolved at root `beforeLoad` and forwarded via router context.

**Data fetching:** TanStack Query + `createServerFn`. Server functions live in `*.functions.ts` files co-located with their feature. Always call `getRequestHeaders()` inside the handler to retrieve auth.

**Database:** Prisma 7 with `@prisma/adapter-pg`. Schema in `prisma/schema/` (multi-file). Generated client in `src/generated/prisma/`. All IDs: `@default(uuid(7))`.

**Forms:** `src/hooks/use-app-form.tsx` exports `useAppForm` (built on `@tanstack/react-form`) with ready-made `InputField`, `PasswordField`, and `SubmitButton` components. Use for all new forms.

**UI components:** shadcn/ui in `src/components/ui/`. Add with `npx shadcn add <component>`. `cn()` helper is in `src/lib/utils.ts`. Globally shared components (AppSidebar, PageHeader) in `src/components/`. Feature-specific components belong inside `src/features/<name>/components/`.

**Styling:** Tailwind v4 (Vite plugin). Biome: tabs, 100-char line width. `src/lib/globals.css` is the single CSS entry.

**Import alias:** `#/` → `src/`

**Validation:** Zod v4 from `"zod/v4"`. Use `z.uuid()` not `z.string().uuid()`.

**Encryption:** AES-256-GCM via `src/lib/crypto.server.ts`. Format: `iv:tag:ciphertext` (hex). Used to store API keys and webhook secrets at rest.

**LLM:** `src/lib/llm.server.ts` — `streamLLM()` → `ReadableStream<SSEChunk>`, `callLLM()` for non-streaming. Provider auto-detected from URL: Anthropic, Ollama, OpenRouter, Groq, or OpenAI-compatible.

**Agent:** `src/lib/agent.server.ts` — `runAgent()` async generator. Runs up to 10 tool-use rounds; yields `AgentChunk` (superset of `SSEChunk`). Built-in tools: `web_search`, `manage_memory`, `manage_notes`, `manage_contacts`, `manage_calendar`, `manage_tasks`, `manage_documents`, `search_chats`, `manage_skills`. MCP tools appended as `mcp__<slug>__<tool>`.

**Embeddings:** `src/lib/embeddings.server.ts` — tries each user endpoint's `/v1/embeddings`. Returns `null` on failure; callers fall back to keyword search.

**Vector search:** pgvector on `Document` and `Memory` tables. `vector(1536)`, IVFFlat cosine index. Raw queries via `prisma.$queryRawUnsafe`. Docker image: `pgvector/pgvector:pg16`.

**Scheduler:** `src/lib/scheduler.server.ts` initialized via side-effect import `#/lib/startup.server` in server route handlers. Drives `ScheduledTask` cron execution.

**Rich text editing:** Tiptap headless editor. Use `useEditor` + `<Tiptap>` + `<Tiptap.Content />`. Add `StarterKit` + `Markdown` extensions for markdown-backed documents. Always set `immediatelyRender: false` for SSR compatibility.

## Code Organization

### Feature folders

Each feature owns its own components, hooks, and types:

```
src/features/<name>/
  components/      # React components used only by this feature
  lib/             # server functions (*.functions.ts), hooks (use-*.ts), types, constants
```

Route files under `src/routes/_authenticated/` are thin: only the `Route` export and a page-level component that composes feature components. No inline component definitions beyond the page itself.

### Hooks

Custom hooks live in `src/features/<name>/lib/use-<name>.ts` (or `src/hooks/` for app-wide hooks). File and export names both follow the `use-` prefix convention.

### Global components

`src/components/ui/` — shadcn primitives only (never modified directly).  
`src/components/` — `AppSidebar`, `PageHeader`, and other cross-feature UI.  
`src/components/ui/custom/` **is removed** — chat-specific primitives live in `src/features/chat/components/`.

### Tests

Tests mirror the source tree under `src/test/`:

```
src/test/
  features/chat/      # tests for src/features/chat/
  lib/                # tests for src/lib/
  setup.ts            # vitest global setup
```

## Non-negotiable Rules

- **Zod v4:** `z.uuid()` not `z.string().uuid()`
- **`createServerFn`:** `.validator(schema)` not `.inputValidator(schema)`
- **Prisma IDs:** `@default(uuid(7))`
- **`LLMMessage.content`:** `string | LLMContentBlock[]` — never `null`
- **Biome:** fix all warnings, never use `biome-ignore`; run `npm run fix` before every commit
- **Server-only:** `.server.ts` files must not be imported from client code
- **No dead code:** delete unused code; no re-exports or `// removed` comments
- **shadcn components:** prefer `<Button>`, `<Input>`, `<Textarea>`, `<Badge>` etc. over raw HTML equivalents
- **Naming:** variables describe what they are (`filteredContacts`, not `arr`); boolean state uses `is`/`has`/`can` prefix (`isOpen`, `hasError`); event handlers use `handle` prefix (`handleSubmit`, `handleDelete`)
- **Comments:** only for non-obvious behavior or workarounds — one short line max; use JSDoc on exported functions when the signature isn't self-explanatory

## Known Good Patterns

```ts
// createServerFn
export const myFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.uuid(), name: z.string().min(1) }))
  .handler(async ({ data }) => { ... });

// Tiptap editor (markdown-backed)
const editor = useEditor({
  extensions: [StarterKit, Markdown],
  content: initialContent,
  contentType: "markdown",
  immediatelyRender: false,
  onUpdate: ({ editor }) => onChange(editor.getMarkdown()),
});

// SSE streaming response
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

Tests live in `src/test/` mirroring the source tree. Setup in `src/test/setup.ts`. jsdom + `@testing-library/jest-dom`.

## Feature Map

| Area | Key files |
|------|-----------|
| Chat + streaming | `src/features/chat/`, `src/routes/api/chat/stream.tsx` |
| Memory (pgvector) | `src/features/memory/`, `src/lib/tools/manage_memory.ts` |
| Documents + RAG | `src/features/documents/`, `src/lib/research.server.ts` |
| Email (IMAP/SMTP) | `src/features/email/`, `src/lib/imap.server.ts`, `src/lib/smtp.server.ts` |
| Calendar (CalDAV) | `src/features/calendar/`, `src/lib/caldav.server.ts` |
| Scheduled tasks | `src/features/tasks/`, `src/lib/scheduler.server.ts` |
| Skills | `src/features/skills/`, `src/routes/_authenticated/skills.tsx`, agent tool: `manage_skills` |
| Notes | `src/features/notes/`, agent tool: `manage_notes` |
| Contacts | `src/features/contacts/`, agent tool: `manage_contacts` |
| Presets | `src/features/chat/lib/preset.functions.ts` |
| Webhooks | `src/features/webhooks/` — HMAC-SHA256, SSRF protection |
| API tokens | `src/features/tokens/`, `src/lib/token.server.ts` (`ody_` prefix) |
| MCP servers | `src/lib/mcp.server.ts`, `src/features/mcp/` |
| Model compare | `src/routes/_authenticated/compare.tsx` |
| Gallery | `src/routes/_authenticated/gallery.tsx` |
| Admin | `src/routes/_authenticated/admin.tsx` |
| Settings | `src/routes/_authenticated/settings.tsx` (tabs: Account, Providers, Theme, Webhooks, API Tokens, Presets, MCP, Data) |
| Backup/import | `src/routes/api/backup/` — non-destructive merge |
| STT proxy | `src/routes/api/stt/transcribe.tsx` → Whisper endpoint |
| Diagnostics | `src/routes/api/diagnostics/` |
| Voice I/O | `MicButton` (Web Speech API), `SpeakButton` (speechSynthesis) |
| Skill injection | Top-5 skills appended to system prompt per request |
| Context compaction | `src/lib/compactor.server.ts` — summarizes at 85% token limit |
| Auto session naming | LLM names session after first exchange; `session_name` SSE event |
| Session fork | Branch any conversation with full history |
| Chat export | Markdown or JSON download |
| PWA | `public/manifest.json`, `public/sw.js` |

## Potential Next Improvements

- **Note reminders** — `Note.dueDate` stored but no cron/notification fires
- **Rate limiting** — no per-user limits on the chat stream endpoint
- **More tests** — `agent.server.ts`, `llm.server.ts` parsing, `imap.server.ts` stubs lack coverage
- **Gallery crop/resize** — upload works; no client-side `<canvas>` editor yet
