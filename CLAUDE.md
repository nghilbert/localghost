# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

This is a ground-up reimplementation of [Odysseus](https://github.com/pewdiepie-archdaemon/odysseus) (the Python/FastAPI app in the `odysseus/` folder) using a modern TypeScript stack. The goal is feature parity with the original — chat, agent, cookbook, research, email, calendar, notes, tasks, contacts, gallery, and more — but with cleaner architecture, type safety, and better UX.

The `odysseus/` directory is the reference implementation. When adding or improving a feature, check the corresponding Python source for behavior expectations, but do not port the implementation verbatim — improve on it.

## Commands

```bash
npm run dev          # start dev server on :3000
npm run build        # type-check + production build
npm run check        # biome lint + format check
npm run fix          # biome auto-fix (lint + format)
npx vitest run       # run tests once
npx vitest run src/test/chat/ChatInput.test.tsx   # run a single test file
npm run prisma -- migrate dev --name <name>
npm run prisma -- generate
```

Start Postgres: `docker compose up db -d`

## Environment

Copy `.env.example` to `.env`. Required: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ENCRYPTION_KEY` (64-char hex — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).

Optional: `SEARXNG_URL` (falls back to DuckDuckGo).

## Architecture

**Framework:** TanStack Start (SSR React, Vite + Hono). File-based routing via TanStack Router. `src/routeTree.gen.ts` is auto-generated — never edit manually; run `npm run dev` after adding routes.

**Route layout:** `src/routes/__root.tsx` wraps the app (ThemeProvider, TooltipProvider, Toaster). `src/routes/_authenticated.tsx` guards auth-required routes and renders the `AppSidebar` + `SidebarInset` shell.

**Auth:** better-auth with email/password. Server: `src/features/auth/lib/auth.server.ts`. Client: `src/features/auth/lib/auth-client.ts`. Session resolved at root `beforeLoad` and forwarded via router context.

**Data fetching:** TanStack Query + `createServerFn`. Server functions in `*.functions.ts` files co-located with their feature. Call `getRequestHeaders()` inside the handler to retrieve session auth. Calling convention: `fn({ data: { ... } })`.

**Database:** Prisma 7 with `@prisma/adapter-pg`. Schema in `prisma/schema/` (multi-file). Generated client in `src/generated/prisma/`. Model types importable from `#/generated/prisma/models`. App model IDs: `@default(dbgenerated("gen_random_uuid()")) @db.Uuid`. Auth table IDs (user/session/account/verification): `@id @db.Uuid` with no `@default` — better-auth supplies them via `advanced.database.generateId`. All FK fields annotated `@db.Uuid`. All camelCase fields mapped to snake_case columns via `@map("snake_case")`. Import `prisma` — never alias it (`prisma as db`).

**Forms:** `src/hooks/use-app-form.tsx` exports `useAppForm` with `InputField`, `PasswordField`, and `SubmitButton`. Use for all new forms.

**UI components:** shadcn/ui in `src/components/ui/`. Add with `npx shadcn add <component>`. `cn()` in `src/lib/utils.ts`. Cross-feature shared components in `src/components/`. Feature-specific components belong in `src/features/<name>/components/`.

**Styling:** Tailwind v4 (Vite plugin). Biome: tabs, 100-char line width. `src/lib/globals.css` is the single CSS entry.

**Import alias:** `#/` → `src/`

**Validation:** Zod v4 from `"zod/v4"`. Use `z.uuid()` not `z.string().uuid()`.

**Encryption:** AES-256-GCM via `src/lib/crypto.server.ts`. Format: `iv:tag:ciphertext` (hex). Used to store API keys and webhook secrets at rest.

**LLM:** `src/lib/llm.server.ts` — `streamLLM()` → `ReadableStream<SSEChunk>`, `callLLM()` for non-streaming. Provider auto-detected from URL: Anthropic, Ollama, OpenRouter, Groq, or OpenAI-compatible.

**Agent:** `src/lib/agent.server.ts` — `runAgent()` async generator. Runs up to 10 tool-use rounds; yields `AgentChunk`. Built-in tools: `web_search`, `manage_memory`, `manage_notes`, `manage_contacts`, `manage_calendar`, `manage_tasks`, `manage_documents`, `search_chats`, `manage_skills`. MCP tools appended as `mcp__<slug>__<tool>`.

**Embeddings:** `src/lib/embeddings.server.ts` — tries each user endpoint's `/v1/embeddings`. Returns `null` on failure; callers fall back to keyword search.

**Vector search:** pgvector on `Document` and `Memory` tables. `vector(1536)`, IVFFlat cosine index. Raw queries via `prisma.$queryRawUnsafe`. Docker image: `pgvector/pgvector:pg16`.

**Scheduler:** `src/lib/scheduler.server.ts` initialized via side-effect import `#/lib/startup.server` in server route handlers.

**Rich text editing:** Tiptap headless editor. Use `useEditor` + `<Tiptap>` + `<Tiptap.Content />` with `StarterKit` + `Markdown` extensions. Always set `immediatelyRender: false` for SSR compatibility.

## Code Organization

### Feature folders

```
src/features/<name>/
  components/    # React components used only by this feature
  hooks/         # custom hooks (use-*.ts)
  lib/           # server functions (*.functions.ts), types, constants
```

Route files under `src/routes/_authenticated/` are thin: only the `Route` export plus a page-level component that composes feature components. No inline sub-components.

### File naming

TanStack Start has special meaning for three suffixes only:
- `*.functions.ts` — server functions (mix of server + query options)
- `*.server.ts` — server-only modules (never imported by client bundles)
- `*.client.ts` — client-only modules

All other files: use plain descriptive names. Type files are `types.ts` (not `xxx.types.ts`). The `.types.ts` suffix is not a TanStack Start convention and should not be used.

### Hooks

Feature-specific hooks go in `src/features/<name>/hooks/use-<name>.ts`. App-wide hooks go in `src/hooks/`. File and export names both use the `use-` prefix.

### Global components

`src/components/ui/` — shadcn-generated primitives. **Never edit these files manually** — use `npx shadcn add <component> --overwrite` to regenerate.  
`src/components/` — `AppSidebar`, `PageHeader`, and other cross-feature UI.

### Tests

Tests live in `src/test/` with one flat folder per feature/area (e.g. `src/test/chat/`, `src/test/lib/`). Setup in `src/test/setup.ts`. jsdom + `@testing-library/jest-dom`.

## Git & SDLC Practices

**Branching:**
- Branch from `main` for all work
- Name branches: `feat/<topic>`, `fix/<topic>`, `refactor/<topic>`, `chore/<topic>`
- One logical change per PR; keep PRs small and reviewable
- PR title: short imperative phrase (≤70 chars) — e.g. `feat: add email compose dialog`
- Merge into `main`

**Before every commit:**
1. `npm run fix` — auto-fix lint/format
2. `npm run check` — confirm zero errors
3. `npx vitest run` — all tests pass
4. `npm run build` — type-check passes

**Testing:**
- Write tests for new pure logic (server functions, utilities, hooks with complex state)
- Component tests for non-trivial UI behavior (interaction, conditional rendering)
- No tests needed for simple pass-through components or thin route wrappers

## Non-negotiable Rules

- **Zod v4:** `z.uuid()` not `z.string().uuid()`
- **`createServerFn`:** `.validator(schema)` — `.inputValidator()` is deprecated
- **Prisma IDs:** app models use `@default(dbgenerated("gen_random_uuid()")) @db.Uuid`; auth tables use `@id @db.Uuid` (no `@default`); all FKs annotated `@db.Uuid`; all camelCase fields use `@map("snake_case")`
- **`LLMMessage.content`:** `string | LLMContentBlock[]` — never `null`
- **Biome:** fix all warnings, never use `biome-ignore`; run `npm run fix` before every commit
- **Server-only:** `.server.ts` files must not be imported from client code
- **No dead code:** delete unused code; no re-exports or `// removed` comments
- **shadcn-first mindset:** Before building a component, ask "what shadcn component best serves this?" Think composition — combine `Card`, `Table`, `Badge`, `Progress`, `Alert`, `Tabs`, `Select` etc. to get the right UX without building from scratch. Use `DataTable` (shadcn table + `@tanstack/react-table`) for tabular data that may grow columns later. Use `Sonner` (`toast`) for post-action feedback. Never use raw HTML where a shadcn equivalent exists;
- **Let components do the work:** Reach for `className` only when you need something the component cannot provide on its own (width constraints, conditional active state, custom color). Never manually reproduce styling a shadcn component already applies — e.g. `<Card>` handles border/background/radius/padding, so `<div className="rounded-lg border bg-card p-4">` is always wrong. Use `CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter` for structure inside cards. Use `<Field>` + `<FieldLabel>` for label-input pairs. Use `<DialogHeader>`/`<DialogTitle>`/`<DialogDescription>` inside every Dialog.
- **No unnecessary nesting:** Never wrap content in a `<div>` unless the wrapper is doing real layout work (flex/grid parent). Flatten wherever possible — prefer direct children in `space-y-*` over intermediate wrapper divs. Two sibling `<p>` tags don't need a wrapping `<div>` just to be together.
- **Layout-agnostic components:** Reusable components (`TaskCard`, `NoteCard`, etc.) must never set their own outer width, max-width, or margins — those are the parent's responsibility. Components fill the space given to them (`w-full`, `flex-1`, or no width at all). Page-level route components are the exception and may set layout constraints.
- **Semantic color tokens:** Always use `bg-card`, `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, etc. — never hardcode colors. Use `bg-primary/10` for subtle tints. All themes just override the CSS variables so any hardcoded color will break theming.
- **No `as` casts:** type things correctly from the start using generics, proper type annotations, or Prisma model types from `#/generated/prisma/models`; `as` is a last resort for genuinely untyped external data
- **Naming:** variables describe what they are (`filteredContacts` not `arr`); booleans use `is`/`has`/`can` prefix; event handlers use `handle` prefix (`handleSubmit`, `handleDelete`); mutations named `<verb>Mutation` not `<verb>Mut`
- **Comments:** only for non-obvious behavior or workarounds; JSDoc on exported functions when the signature isn't self-explanatory
- **Sortable data tables:** use `@tanstack/react-table` with shadcn's `Table` primitives; scores/metrics should have both an overall value and the component scores it's derived from; always make numeric columns sortable by clicking the header
- **Post-action toasts:** after mutations that the user waits for (pull, delete, save), always fire a `toast.success` / `toast.error` from `sonner`
- **Branching:** always create a `feat/`, `fix/`, `refactor/`, or `chore/` branch before starting work; never commit directly to `main`; use `gh pr create` to open PRs

## Known Good Patterns

```ts
// createServerFn — validator + handler
export const myFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.uuid(), name: z.string().min(1) }))
  .handler(async ({ data }) => { ... });

// Calling a server fn from a mutation
const deleteMutation = useMutation({
  mutationFn: (id: string) => deleteItem({ data: { id } }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["items"] }),
});

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

// pgvector raw query (use snake_case column names — no quoted identifiers)
await prisma.$executeRawUnsafe(
  `UPDATE memory SET embedding = $1::vector WHERE id = $2`,
  toVectorLiteral(embedding), id,
);
```

## Feature Map

| Area | Key files |
|------|-----------|
| Cookbook (model browser) | `src/features/cookbook/`, `src/routes/api/cookbook/pull.tsx`, `src/lib/hardware.server.ts` |
| Chat + streaming | `src/features/chat/`, `src/routes/api/chat/stream.tsx` |
| Memory (pgvector) | `src/features/memory/`, `src/lib/tools/manage_memory.ts` |
| Documents + RAG | `src/features/documents/`, `src/lib/research.server.ts` |
| Email (IMAP/SMTP) | `src/features/email/`, `src/lib/imap.server.ts`, `src/lib/smtp.server.ts` |
| Calendar (CalDAV) | `src/features/calendar/`, `src/lib/caldav.server.ts` |
| Scheduled tasks | `src/features/tasks/`, `src/lib/scheduler.server.ts` |
| Skills | `src/features/skills/`, `src/routes/_authenticated/skills.tsx` |
| Notes | `src/features/notes/` |
| Contacts | `src/features/contacts/` |
| Presets | `src/features/chat/lib/preset.functions.ts` |
| Webhooks | `src/features/webhooks/` — HMAC-SHA256, SSRF protection |
| API tokens | `src/features/tokens/`, `src/lib/token.server.ts` (`ody_` prefix) |
| MCP servers | `src/lib/mcp.server.ts`, `src/features/mcp/` |
| Model compare | `src/features/compare/`, `src/routes/api/compare/stream.tsx` |
| Gallery | `src/features/gallery/`, `src/routes/api/gallery/upload.tsx` |
| Admin | `src/features/admin/lib/admin.functions.ts` |
| Settings | `src/features/settings/components/` (8 tab components) |
| Backup/import | `src/routes/api/backup/` — non-destructive merge |
| STT proxy | `src/routes/api/stt/transcribe.tsx` → Whisper endpoint |
| Diagnostics | `src/routes/api/diagnostics/` |
| Voice I/O | `MicButton` (Web Speech API), `SpeakButton` (speechSynthesis) |
| Context compaction | `src/lib/compactor.server.ts` — summarizes at 85% token limit |
| PWA | `public/manifest.json`, `public/sw.js` |

## Potential Next Improvements

- **Note reminders** — `Note.dueDate` stored but no cron/notification fires
- **Rate limiting** — no per-user limits on the chat stream endpoint
- **More tests** — `agent.server.ts`, `llm.server.ts` parsing, `imap.server.ts` stubs lack coverage
- **Gallery crop/resize** — upload works; no client-side `<canvas>` editor yet
- **Research feature components** — `src/features/research/` only has `use-research-stream.ts`; no components yet
