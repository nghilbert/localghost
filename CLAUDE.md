# CLAUDE.md

Guidance for Claude Code working in this repository.

## Non-negotiable Rules

- **Work with the framework:** never hand-roll what a dependency does; no parallel implementation, bridge, or shim. Adopt the library's native model (types, persistence, helpers) even if the diff grows.
- **shadcn-first:** compose shadcn primitives (consult the MCP registry); no raw HTML where a shadcn equivalent exists, no forking `ui/`. Stack is shadcn on Base UI (`@base-ui/react/*`), not Radix: compose with the `render={<El/>}` prop (Base UI's `asChild`). Themeable via CSS variables only, no hardcoded colors. `src/shared/ui/*` is registry output: prefer regenerating (`npx shadcn@latest add <component> --overwrite`) over hand-editing; a hand-edit is allowed rarely and only with a stated reason (`sonner.tsx`'s `ThemeContext` wiring is the precedent).
- **Prisma:** app model IDs `@default(dbgenerated("uuidv7()")) @db.Uuid`; auth-table IDs `@id @db.Uuid` with no `@default`; all FKs `@db.Uuid`; all camelCase fields `@map("snake_case")`.
- **Biome:** never `biome-ignore`; fix the real issue.
- **Server-only:** never import `.server.ts` from client code.
- **Comments:** only for non-obvious behavior. Exported functions get JSDoc; add `@param`/`@returns`/`@throws`/`{@link}` tags only where they add what the name and type don't. Describe the code, never PR history.
- **No `as` casts:** type via generics, annotations, or Prisma model types.
- **No positional params:** two or more params means one named object (one positional is fine); better, remove the boundary so the value is read from its owner.
- **No dead code:** delete unused code; no re-exports, no `// removed` comments.
- **Components own their styling:** an ad-hoc card surface in feature code is a `<Card>`, not a raw `<div className="rounded-lg border bg-card p-4">`. Reach for `className` only for layout the component cannot do itself.
- **Layout-agnostic components:** reusable components never set their own width, max-width, or margins; the parent owns layout.
- **Post-action toasts:** after user-awaited mutations, fire `toast.success` / `toast.error` from `sonner`.
- **Test complex work:** for real moving parts (parsers, data transforms, non-trivial UI), write Vitest tests in `src/test/<area>/` asserting real behavior. Keep test data inline or tiny; craft the minimal input, never commit captured blobs.

## Project Purpose

A modern, local-first AI chat app: install any model you want (local via Ollama, or a bring-your-own cloud endpoint) and chat with it, as polished as the big brands but yours. The **Library** is the core surface (browse and install models, then chat). Capabilities are **inline tools, never tabs**: web search, MCP servers, and a long-term **Memory** live inside chat, toggled per message.

## Commands

```bash
npm run dev          # dev server on :3000
npm run build        # type-check + production build
npm run check        # biome lint + format check
npm run fix          # biome auto-fix
npm run test -- run  # run tests once
npm run prisma -- migrate dev --name <name>
npm run prisma -- generate
```

**Inner dev loop (fastest HMR):** `docker compose up db -d` then `npm run dev`: the app runs native against a Dockerized Postgres.

**Full stack in Docker:** `COMPOSE_PROFILES=ollama,dev docker compose up --build`: the `dev` profile runs Vite with HMR over a bind mount (`web-dev` service); the `ollama` profile adds a bundled Ollama. `COMPOSE_FILE` overlays add GPU access; see `.env.example` / `README.md`.

## Workflow

Commits, pushes, and prisma commands are the user's job (a PreToolUse guard blocks them). Edit code and schema, then hand off:

- Before finishing, verify your edits: `npm run check`, plus `npm run build` for types.
- End the summary with one section per logical change: a fenced `git add <paths>`, then the commit message in its own fenced block (imperative subject under 70 chars, one to three sentences of what and why). No co-author or generated-with lines.
- Prisma: edit `prisma/schema/` only, then tell the user what to run.
- Never edit generated output (`src/generated/`, `routeTree.gen.ts`); change the source and regenerate. `src/shared/ui/*` is regenerable too, but a rare, stated-reason hand-edit is fine (see shadcn-first above).

## Environment

Copy `.env.example` to `.env`. Required: `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET`, `ENCRYPTION_KEY` (64-char hex). `DATABASE_URL` is a single `.env` line interpolated from `POSTGRES_*` by dotenvx; DB-touching scripts run through `dotenvx run`. Optional: `SEARXNG_URL` (unset disables web search with a guidance message).

## Architecture

- **Framework:** TanStack Start (SSR React, Vite + Hono); file-based routing. Alias `#/` maps to `src/`.
- **Routes = the pages layer.** `_authenticated.tsx` guards auth and renders the colocated `AppSidebar` shell. A route file owns the `Route` export (loader/head/search) and its page component `<RouteSubject>Page` (`library.tsx` defines `LibraryPage`). A route with multi-file building blocks owns a route directory (`settings.tsx` → `settings/index.tsx`) with kind-based `-`-prefixed segments hidden from route gen (`-components/`, `-hooks/`, `-lib/`), mirroring features' segment folders (`settings/-components/AccountTab.tsx`, `_authenticated/-components/AppSidebar/`); a `-components/` folder is fine with a single member. Server-only logic shared by sibling API route handlers is one `-<name>.server.ts` file (`api/backup/-backup.server.ts`).
- **Auth:** better-auth (email/password); session resolved at root `beforeLoad`.
- **Data:** TanStack Query + `createServerFn` in co-located `*.functions.ts`, called as `fn({ data })`. A `*.functions.ts` is a thin RPC boundary: validate input, resolve the user, delegate to the sibling `<noun>.server.ts` (owns prisma/crypto/external calls); `queryOptions` colocate at the file bottom. `memory` is the reference split.
- **Database:** Prisma 7 + `@prisma/adapter-pg`. Multi-file schema in `prisma/schema/`, client in `src/generated/prisma/`. Import `prisma`, never alias.
- **Styling:** Tailwind v4; `src/shared/lib/globals.css` is the single CSS entry. Light/dark via `.dark` on `<html>`. `cn()` in `src/shared/lib/utils.ts`. Gotcha: `InputGroup` greys the whole group if any descendant is `disabled` (`has-disabled:`); for a control blocked by fixable state use `aria-disabled` (skips greying, keeps pointer events for its own tooltip). A genuinely disabled control that needs a tooltip needs a span-`render` trigger, since disabled elements swallow pointer events (see `LockedModel`, `ToolsMenu`).
- **LLM:** `src/shared/lib/llm.server.ts`: `streamLLMEvents(opts)` returns `AsyncIterable<StreamChunk>`; pass `tools: ServerTool[]` to run the agent loop. A data-driven `PROVIDERS` registry handles per-provider URL/header/model-list/options quirks, provider auto-detected from URL. Wraps `@tanstack/ai`'s `chat()`.
- **Tools:** `agent.server.ts` `buildChatTools()` assembles the built-in `ServerTool[]` (`web_search`, `read_url`, `manage_memory`); `chat()` auto-executes them. One chat, no separate "agent mode". Client sends the per-request selection via `forwardedProps` (not persisted). Web search starts enabled whenever the server offers it (`SEARXNG_URL` set, via `getToolAvailability`); every other tool starts off, keeping small models reliable.
- **Chat persistence:** one `Conversation` row = one `UIMessage[]` blob (`messages` JSONB); the client owns persistence via `ChatClientPersistence` (`chat-client.ts`), so `/api/chat/stream` does zero DB writes.

## Forms

`useAppForm` (TanStack Form) in `src/shared/hooks/use-app-form/`, field components in its `fields/`. Never hand-wire `useState`-per-field + `Input`; add a field component instead. Validate with Zod v4 via `validators: { onDynamic: Schema }`; submit via `form.handleSubmit()`.

**Submitting:** `onSubmit` awaits a plain `mutation.mutate(value)`, never `mutateAsync`. The mutation owns feedback: define `onSuccess` and `onError` on `useMutation` (firing `toast.success` / `toast.error` there) so submit handlers stay one line. Don't surface the same error twice; the `onError` toast is the error channel. Reserve inline `FormError` for inline affordances (a "Test connection" result), not the submit mutation's error.

## React & Data Practices

- Derive values during render. Never mirror props or query data into `useState` synced by `useEffect`; effects are only for real external systems (DOM APIs, subscriptions, timers).
- List `key`s come from data ids, never array indexes.
- Mutations invalidate the queries they touch in `onSuccess` via `queryClient.invalidateQueries`; no manual refetching, no local copies of server state.
- Route-level data loads through shared `queryOptions()` used by both the route loader and `useQuery`; components never ad-hoc `fetch`. Every route with queries defines a loader: `context.queryClient.ensureQueryData(...)` (awaited) for fast first-paint data, an un-awaited `prefetchQuery(...)` for slow scans the page already renders skeletons for.
- One Zod schema per shape, shared by the form validator and the server fn input; never declare the same shape twice.
- Annotate exported function signatures; let locals and obvious generics infer.

## Code Organization

Four folders, one convention: dependencies flow **one way** `shared → entities → features → routes`. Judgment, not machinery: no layer linter, no barrels.

```
src/
  shared/        # framework-agnostic reusables, zero domain knowledge
    ui/          #   shadcn primitives only (flat files, generated); regenerate, don't fork
    components/  #   our own reusable components (DataTable/, RouteErrorScreen/)
    lib/         #   utils, crypto/db/llm/auth/session infra (*.server.ts), ollama SDK client, constants, globals.css
    hooks/       #   use-app-form/, use-is-mobile
    theme/       #   ThemeContext provider + theme.ts (app-wide, so shared, not a feature)
  entities/      # domain nouns, files kept flat: <noun>.server.ts (data access) + <noun>.functions.ts (thin RPC + queryOptions) + schemas
    endpoint/    #   the core noun other entities lean on (conversation imports it)
    conversation/   memory/   user-settings/
  features/      # user interactions (verbs), one slice each; keep components/hooks/lib segment folders
    auth/  send-message/  pull-model/  manage-endpoints/
  routes/        # TanStack routing == the pages layer; each route file owns Route + its <X>Page component
    _authenticated/
      -components/AppSidebar/       # the shell, colocated (the `-` prefix hides it from route gen)
      settings/                     # a route directory: index.tsx + -components/ -hooks/ -lib/
```

- **One-way deps, by convention.** No imports between features; share downward through `entities/` or `shared/`. Cross-entity imports stay rare (`conversation` importing `endpoint` is the only one today). Routes compose anything below them.
- **Where a new file goes** (first match wins): (1) used by one component, that component's folder; (2) part of one interaction, that feature's `components`/`hooks`/`lib`; (3) domain data used by 2+ features, `entities/<noun>` flat; (4) domain-free infra or UI, `shared/`; (5) page composition or multi-feature orchestration, the route file, with its multi-file building blocks in a `-`-prefixed sibling folder.
- **No barrels.** Import the specific module (`#/features/send-message/lib/chat-client`), not a slice root; barrels hurt Vite HMR and tree-shaking. `ComponentName/index.tsx` is a single component, not a re-export.
- **Entities are flat; features keep `components/hooks/lib`.** A lone hook serving one page lives beside that page, not in a feature. Components at 250+ lines or with sub-components become `ComponentName/index.tsx` folders.
- **File suffixes are build boundaries:** `*.functions.ts` (the `createServerFn` RPC boundary), `*.server.ts` (server-only, stripped from the client bundle); `types.ts` for types, `schemas.ts` for Zod. The `.client.ts` suffix is banned (breaks SSR for isomorphic modules).
- `src/shared/components/DataTable/` is the only table; never hand-roll `useReactTable`.

### Naming

The mechanical rules (camelCase Zod schemas, the banned `.client.ts` suffix) are enforced by `.claude/hooks/text-check.ts`. The judgment calls it cannot decide:

- **Slice = the interaction (features) or the noun (entities), not the tab or route.** A verb names a feature (`send-message`, `pull-model`); a noun names an entity (`endpoint`, `conversation`). Placement follows dependency direction, not usage: shared infra an entity needs (`getCurrentUserId`, the ollama client) lives in `shared/lib`, never in a feature the entity would reach up into.
- **Files:** domain-noun where an entity exists (`conversation.functions.ts`); role-based for non-model infra (`db.server.ts`, `llm.server.ts`).
- **Server fns:** `list*` returns an array, `get*` a single entity or aggregate, `create*`/`update*`/`delete*` mutate, action verbs (`scan`/`test`/`register`) where CRUD does not fit.
- **Layering verbs:** a helper and its wrapping fn may differ in verb (`probeEndpoint` becomes `testEndpoint`) but share the noun and never collide on the exact name.

## Testing

Vitest in `src/test/<area>/` (folders named for the slice they test: the feature verb or entity noun, e.g. `send-message/`, `pull-model/`, `endpoint/`, never by test type), run with `npm run test -- run` (see the "Test complex work" rule for _when_). Two projects split by extension: `*.test.ts` runs in node (`unit`), `*.test.tsx` in headless Chromium via browser mode (`browser`). Browser tests use `render`/`renderHook` from `#/test/utils` (wraps `vitest-browser-react`; both async), interactions via locators (`await screen.getByTestId(...).click()`) or `userEvent` from `vitest/browser`, assertions via `await expect.element(...)` / `expect.poll`. `.claude/hooks/text-check.ts` enforces the mechanical patterns (userEvent over `fireEvent`, no casts, query by `data-testid` not role/label/text). The judgment:

- **Test our seams, not our dependencies.** Target logic we wrote (wiring, input parsing, transforms, registries, merge/normalize). Litmus: if it would still pass with our code deleted, it tests the library.
- **Extract pure logic, test it plain** (inline inputs, no `render`, no DB): `toolRows` in `ToolsMenu.tsx`. A `.test.ts` in node beats a browser render it doesn't need.
- `data-testid` is kebab-case and component-scoped (`model-picker-trigger`); the field/DataTable/ModelPicker tests are the reference. The testid exception: an element a library renders that won't forward one (Streamdown output, a Base UI Slider thumb).
- Folder = slice: `src/test/pull-model/` tests `src/features/pull-model/`, `src/test/endpoint/` tests `src/entities/endpoint/`. Domain-free infra keeps its `shared/lib` name (`src/test/lib/ollama-url.test.ts`).
- **Derive minimal inputs inline; never commit recorded fixtures.**

## Feature Map

| Area | Key files |
|------|-----------|
| Chat + streaming | feature `src/features/send-message/` (`lib/agent.server.ts`, `lib/chat-client.ts`), entity `src/entities/conversation/`, page `src/routes/_authenticated/chat/$conversationId.tsx`, `src/routes/api/chat/stream.tsx` |
| Library (core) | feature `src/features/pull-model/` (`lib/ollama/catalog.server.ts` scrapes ollama.com, `lib/catalog.ts` scores hardware fit, `lib/hardware.server.ts` probes the host), page `src/routes/_authenticated/library.tsx`: browse and install local models |
| Endpoints / providers | entity `src/entities/endpoint/` (the kernel: endpoint api, schemas, query hooks), feature `src/features/manage-endpoints/` (the config UI + `lib/providers.ts` registry) |
| Memory (pgvector) | entity `src/entities/memory/` (`memory.functions.ts` RPC, `memory.server.ts` data access, `memory-tool.server.ts` agent tool, `embeddings.server.ts`); opt-in per-message tool, browse/delete in Settings |
| Built-in agent tools | wired in `src/features/send-message/lib/agent.server.ts`; handlers in `src/shared/lib/tools/{web-search,read-url}.server.ts` + `src/entities/memory/memory-tool.server.ts`; client toggle list in `send-message/lib/tool-catalog.ts`, availability in `send-message/lib/tools.functions.ts` |
| Settings | page `src/routes/_authenticated/settings/` (`index.tsx` + `-components/` tabs + `-hooks/`: account, memory, `manage-endpoints`, theme) |
| Backup/import | `src/routes/api/backup/` (handlers + colocated `-backup.server.ts`): non-destructive merge |
| Auth | feature `src/features/auth/` (UI + sign-in/out fns), session infra `src/shared/lib/{auth,session}.server.ts` |
| Theme | `src/shared/theme/` (provider + constants), Appearance tab in Settings |
