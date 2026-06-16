# CLAUDE.md

Guidance for Claude Code working in this repository.

## Project Purpose

A ground-up TypeScript reimplementation of [Odysseus](https://github.com/pewdiepie-archdaemon/odysseus) (the Python/FastAPI app at `../odysseus/`). Goal: feature parity — chat, agent, cookbook, research, email, calendar, notes, tasks, contacts, gallery — with cleaner architecture, type safety, and better UX. Treat `../odysseus/` as the behavior reference, but improve on it rather than porting verbatim.

## Commands

```bash
npm run dev          # dev server on :3000
npm run build        # type-check + production build
npm run check        # biome lint + format check
npm run fix          # biome auto-fix
npx vitest run       # run tests once
npx vitest run src/test/chat/ChatInput.test.tsx   # single test file
npm run prisma -- migrate dev --name <name>
npm run prisma -- generate
```

**Dev loops** — develop natively, validate against the production image. `COMPOSE_PROFILES` selects a run mode (`prod` = built image, `dev` = Vite with HMR) plus optional `ollama` (the bundled Ollama container; omit it to use a host-native Ollama); the `web` and `web-dev` services are mutually exclusive on port 3000, so exactly one mode is active. GPU hardware is selected separately via `COMPOSE_FILE` — append `compose.nvidia.yaml` or `compose.amd.yaml` to give both Ollama and the cookbook hardware panel GPU access. CPU hosts leave `COMPOSE_FILE` unset; the cookbook shows "No GPU detected" by design.
- **Inner loop:** `docker compose up db -d` then `npm run dev`. Fastest HMR. Run Ollama natively at `localhost:11434` and add it as an in-app endpoint.
- **Dockerized dev:** `COMPOSE_PROFILES=ollama,dev docker compose up --build` — runs the `dev` Dockerfile stage as `web-dev`, serving Vite with HMR over a bind mount. Author migrations via `docker compose exec web-dev npm run prisma -- migrate dev --name <name>`.
- **Parity check (pre-push):** `docker compose up --build` — with the default `COMPOSE_PROFILES=ollama,prod`, builds the production Dockerfile and runs the bundled server (`.output/server/index.mjs`) against Dockerized Postgres.

## Environment

Copy `.env.example` to `.env`. Required: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ENCRYPTION_KEY` (64-char hex — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). Optional: `SEARXNG_URL` (falls back to DuckDuckGo).

## Architecture

- **Framework:** TanStack Start (SSR React, Vite + Hono); file-based routing. `src/routeTree.gen.ts` is generated — never edit; run `npm run dev` after adding routes. Import alias `#/` → `src/`.
- **Routes:** `__root.tsx` wraps the app (ThemeProvider, TooltipProvider, Toaster); `_authenticated.tsx` guards auth and renders the `AppSidebar` shell. Files under `_authenticated/` are thin — only the `Route` export plus a page component composing feature components, no inline sub-components.
- **Auth:** better-auth (email/password). Server `src/features/auth/lib/auth.server.ts`, client `auth-client.ts`. Session resolved at root `beforeLoad`, forwarded via router context.
- **Data:** TanStack Query + `createServerFn` in co-located `*.functions.ts`. Use `getRequestHeaders()` in the handler for session auth. Call as `fn({ data: { ... } })`.
- **Database:** Prisma 7 + `@prisma/adapter-pg`. Multi-file schema in `prisma/schema/`. Generated client in `src/generated/prisma/`; model types from `#/generated/prisma/models`. Import `prisma` — never alias.
- **Styling:** Tailwind v4 (Vite plugin). `src/lib/globals.css` is the single CSS entry. Light/dark via the `.dark` class on `<html>` (`ThemeProvider`, localStorage `odysseus-mode`, no-flash inline script in `__root.tsx`). One CSS file per theme preset, imported from globals.css. `cn()` in `src/lib/utils.ts`.
- **Encryption:** AES-256-GCM (`src/lib/crypto.server.ts`), format `iv:tag:ciphertext` (hex). Stores API keys and webhook secrets at rest.
- **LLM:** `src/lib/llm.server.ts` — `streamLLM()` → `ReadableStream<SSEChunk>`, `callLLM()` non-streaming. Provider auto-detected from URL (Anthropic, Ollama, OpenRouter, Groq, OpenAI-compatible).
- **Agent:** `src/lib/agent.server.ts` — `runAgent()` async generator, up to 10 tool rounds, yields `AgentChunk`. Built-in tools (`web_search`, `manage_*`, `search_chats`) plus MCP tools as `mcp__<slug>__<tool>`.
- **Embeddings / vector search:** `embeddings.server.ts` tries each endpoint's `/v1/embeddings` (`null` on failure → keyword fallback). pgvector `vector(1536)` IVFFlat cosine on `Document`/`Memory`; raw queries via `prisma.$queryRawUnsafe` (`pgvector/pgvector:pg16`).
- **Scheduler:** `src/lib/scheduler.server.ts`, initialized via side-effect import `#/lib/startup.server`.
- **Markdown:** rendered with `streamdown` (`<Streamdown>` via `src/components/Markdown/`), with `@streamdown/code` for syntax highlighting wired through `globals.css`. Streaming-safe; no rich-text editor — notes and other text are plain markdown strings.

## Forms

`src/hooks/use-app-form.ts` exports `useAppForm` (TanStack Form). Field components live in `src/components/appForm/` — `InputField`, `PasswordField`, `SelectField`, `TextareaField`, `ToggleGroupField`, `MultiToggleField`, `ColorField`, `DateField` (Calendar + Popover; stores `yyyy-mm-dd`), `SwitchField`, `SwatchField`, `ChecklistField` — and share `useAppField` (`src/hooks/use-app-field.ts`) plus the shared `FieldShell` (`src/components/appForm/FieldShell.tsx`) for label + optional `description` + validation error. Context is in `src/hooks/app-form-context.ts`.

- **All submit forms must use `useAppForm`** — never hand-wire `useState`-per-field + `Input`. (Live draft editors like `SkillEditor`/`DocumentEditor` that patch state on change are not submit forms.)
- Validate with a Zod v4 schema via `validators: { onDynamic: Schema }` + `validationLogic: revalidateLogic()`; field errors render automatically through `FieldError` (`errorMap.onDynamic`).
- Submit via `<form onSubmit={…form.handleSubmit()}>` + `form.AppForm` / `form.AppField`. Await with inline callbacks, not try/catch.
- Need a field type the hook lacks? Add a new field component — don't hand-wire.
- Layout: whatever stock structure fits — usually a stacked `FieldGroup`; `DialogFooter` for dialog actions; `<Field orientation="horizontal">` for inline rows. `SubmitButton` is natural width — no wrapper divs or width classes. Reference: `SignUpForm.tsx`, `NoteForm.tsx`.

## Code Organization

```
src/features/<name>/
  components/   # components used only by this feature
  hooks/        # use-*.ts
  lib/          # *.functions.ts server fns, types, constants
```

- **Large components → folders:** past ~250 lines or with inline sub-components, become `ComponentName/index.tsx` + a sibling file per sizable sub-component; import path stays `.../ComponentName`. See `AppSidebar/`, `cookbook/components/ModelTable/`.
- **File naming:** only three suffixes are special — `*.functions.ts` (server fns), `*.server.ts` (server-only), `*.client.ts` (client-only). Everything else uses plain descriptive names; type files are `types.ts` (never `.types.ts`).
- **Hooks:** feature hooks in `src/features/<name>/hooks/use-<name>.ts`; app-wide in `src/hooks/`. File and export names both `use-`-prefixed.
- **Global components:** `src/components/ui/` are shadcn primitives — never edit by hand; regenerate via `npx shadcn add <component> --overwrite`. Cross-feature UI in `src/components/`; feature-specific in `src/features/<name>/components/`.
- **Tables:** `src/components/DataTable/` is the only table implementation (shadcn `Table` + `@tanstack/react-table`): `DataTable` + `DataTableColumnHeader`. Never hand-roll another `useReactTable` + `Table`; use it for any tabular data that may grow columns. Numeric columns sortable via the header; scores/metrics show both an overall value and the component scores.
- **Tests:** in `src/test/`, one flat folder per area (`src/test/chat/`, `src/test/lib/`); setup in `src/test/setup.ts` (jsdom + jest-dom). Write tests for new pure logic and non-trivial UI behavior; skip pass-through components and thin route wrappers.

## Git & SDLC

- Branch from `main`: `feat/`, `fix/`, `refactor/`, `chore/` — never commit to `main`. One logical change per PR, kept small and reviewable. PR title ≤70 chars, imperative. Open with `gh pr create`; merge into `main`.
- **Before every commit, all four must pass:** `npm run fix` → `npm run check` → `npx vitest run` → `npm run build`.

## Non-negotiable Rules

- **Zod v4:** import from `"zod/v4"`; `z.uuid()`, not `z.string().uuid()`.
- **`createServerFn`:** use `.validator(schema)` (`.inputValidator()` is deprecated).
- **Prisma:** app model IDs `@default(dbgenerated("gen_random_uuid()")) @db.Uuid`; auth-table IDs (user/session/account/verification) `@id @db.Uuid` with no `@default` (better-auth supplies them via `advanced.database.generateId`); all FKs `@db.Uuid`; all camelCase fields `@map("snake_case")`.
- **`LLMMessage.content`:** `string | LLMContentBlock[]` — never `null`.
- **Biome:** tabs, 100-char width; fix all warnings, never use `biome-ignore`.
- **Server-only:** never import `.server.ts` from client code.
- **No `as` casts:** type correctly via generics, annotations, or Prisma model types from `#/generated/prisma/models`; `as` is a last resort for genuinely untyped external data.
- **No dead code:** delete unused code; no re-exports or `// removed` comments.
- **shadcn-first:** before building UI, ask which shadcn component fits and consult the shadcn MCP registry (`search_items_in_registries`, `get_item_examples_from_registries`) for the canonical pattern — especially tables, forms, and pickers. Compose primitives (`Card`, `Badge`, `Progress`, `Alert`, `Tabs`, `Select`, …); never raw HTML where a shadcn equivalent exists. The UI must stay themeable purely by overriding CSS variables.
- **Let components do the work:** reach for `className` only for what a component can't do itself (width, conditional active state). Never reproduce styling a component already applies — `<div className="rounded-lg border bg-card p-4">` is always wrong; that's `<Card>`. Use the sub-components (`CardHeader`/`CardContent`/…, `Field`/`FieldLabel`, `DialogHeader`/`DialogTitle`/…). A long `className`, an extracted className constant, a stack of wrapper divs, or a non-semantic color are smells the component already does the job.
- **Never engineer toward visual parity:** when rebuilding UI, pick the stock shadcn composition that fits the content and accept it looks different from before. Preserving the old look with wrapper divs, width classes, or custom classNames is the failure mode — drop custom styling without asking.
- **Semantic color tokens only:** `bg-card`, `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary/10` for subtle tints — never hardcode colors (any hardcoded color breaks theming).
- **No unnecessary nesting:** wrap content in a `<div>` only when it does real layout work (flex/grid parent); prefer direct children in `space-y-*` over intermediate wrappers.
- **Layout-agnostic components:** reusable components never set their own width, max-width, or margins — the parent owns layout; they fill the space given (`w-full`, `flex-1`, or nothing). Page-level route components may set layout constraints.
- **Naming:** descriptive variables (`filteredContacts`, not `arr`); booleans `is`/`has`/`can`; event handlers `handle*`; mutations `<verb>Mutation`.
- **Comments:** only for non-obvious behavior or workarounds; JSDoc on exported functions when the signature isn't self-explanatory. Describe what the code is and does (`@param`/`@returns`) — never narrate PR or changelog history.
- **Post-action toasts:** after user-awaited mutations (pull, delete, save), fire `toast.success` / `toast.error` from `sonner`.

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
| Scheduled tasks | `src/features/tasks/`, `src/lib/scheduler.server.ts` |
| Skills | `src/features/skills/`, `src/routes/_authenticated/skills.tsx` |
| Notes | `src/features/notes/` |
| Presets | `src/features/chat/lib/preset.functions.ts` |
| Theme / dark mode | `src/features/theme/` |
| Webhooks | `src/features/webhooks/` — HMAC-SHA256, SSRF protection |
| MCP servers | `src/lib/mcp.server.ts`, `src/features/mcp/` |
| Model compare | `src/features/compare/`, `src/routes/api/compare/stream.tsx` (Cookbook tab) |
| Admin | `src/features/admin/lib/admin.functions.ts` |
| Settings | `src/features/settings/components/` (one component per tab) |
| Backup/import | `src/routes/api/backup/` — non-destructive merge |
| Voice I/O | `MicButton` (Web Speech API), `SpeakButton` (speechSynthesis) — zero-dep, native |
| Context compaction | `src/lib/compactor.server.ts` — summarizes at 85% token limit |
| Dev seed | `prisma/seed.ts` (`npm run seed`) — faker data; `dev@example.com` / `password123` |
| PWA | `public/manifest.json`, `public/sw.js` |
