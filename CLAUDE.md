# CLAUDE.md

Guidance for Claude Code working in this repository.

## Non-negotiable Rules

- **Work with the framework:** never hand-roll what a dependency does; no parallel implementation, bridge, or shim. Adopt the library's native model (types, persistence, helpers) even if the diff grows.
- **shadcn-first:** compose shadcn primitives (consult the MCP registry); no raw HTML where a shadcn equivalent exists, no forking `ui/`. Stack is shadcn on Base UI (`@base-ui/react/*`), not Radix: compose with the `render={<El/>}` prop (Base UI's `asChild`). Themeable via CSS variables only, no hardcoded colors. Follow current shadcn, Base UI, TS, and React best practices.
- **Prisma:** app model IDs `@default(dbgenerated("uuidv7()")) @db.Uuid`; auth-table IDs `@id @db.Uuid` with no `@default`; all FKs `@db.Uuid`; all camelCase fields `@map("snake_case")`.
- **Biome:** never `biome-ignore`; fix the real issue.
- **Server-only:** never import `.server.ts` from client code.
- **Comments:** only for non-obvious behavior. Exported functions get JSDoc; add `@param`/`@returns`/`@throws`/`{@link}` tags only where they add what the name and type don't. Describe the code, never PR history.
- **No `as` casts:** type via generics, annotations, or Prisma model types.
- **No positional params:** two or more params means one named object; one positional is fine. Better, remove the boundary so the value is read from its owner.
- **No dead code:** delete unused code; no re-exports, no `// removed` comments.
- **Components own their styling:** an ad-hoc card surface (`<div className="rounded-lg border bg-card p-4">`) in feature code is wrong; that is `<Card>`. Reach for `className` only for layout the component cannot do itself.
- **Layout-agnostic components:** reusable components never set their own width, max-width, or margins; the parent owns layout.
- **Post-action toasts:** after user-awaited mutations, fire `toast.success` / `toast.error` from `sonner`.
- **Test complex work:** for real moving parts (parsers, data transforms, non-trivial UI), write Vitest tests in `src/test/<area>/` asserting real behavior. Keep test data inline or tiny; never commit large captured blobs as fixtures, craft the minimal input.

## Project Purpose

A modern, local-first AI chat app: install whatever model you want (local via Ollama, or bring-your-own cloud endpoint) and chat with it — as simple and polished as the big brands, but yours. The **Library** is the core surface (browse and install models, then chat). Capabilities are **inline tools, never tabs**: web search, MCP servers, and a long-term **Memory** all live inside chat, toggled per message. Keep it simple and powerful.

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

**Inner dev loop (fastest HMR):** `docker compose up db -d` then `npm run dev` — app native against a Dockerized Postgres.

**Full stack in Docker:** `COMPOSE_PROFILES=ollama,dev docker compose up --build` — the `dev` profile runs Vite with HMR over a bind mount (`web-dev` service); the `ollama` profile adds a bundled Ollama. `COMPOSE_FILE` overlays add GPU access; see `.env.example` / `README.md`.

## Environment

Copy `.env.example` to `.env`. Required: `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET`, `ENCRYPTION_KEY` (64-char hex). `DATABASE_URL` is a single `.env` line interpolated from `POSTGRES_*` by dotenvx; DB-touching scripts run through `dotenvx run`. Optional: `SEARXNG_URL` (unset disables web search with a guidance message).

## Architecture

- **Framework:** TanStack Start (SSR React, Vite + Hono); file-based routing. Import alias `#/` → `src/`.
- **Routes = the pages layer.** `_authenticated.tsx` guards auth and renders the colocated `AppSidebar` shell (`_authenticated/-components/AppSidebar/`). Route files are thin: the `Route` export wiring loader/head/search to one page component. Page compositions live beside the route in a `-page/` folder, hidden from route generation by the `-` prefix (`routeFileIgnorePrefix`, default `-`): `_authenticated/-page/{LibraryPage,NewChatView,settings/*}` and `_authenticated/chat/-page/ConversationPage`. The bound component is named `<RouteSubject>Page`. The building blocks it composes keep descriptive names (`SignInForm`, `AccountTab`, `ChatView`).
- **Auth:** better-auth (email/password). Session resolved at root `beforeLoad`.
- **Data:** TanStack Query + `createServerFn` in co-located `*.functions.ts`. Call as `fn({ data: { ... } })`.
- **Database:** Prisma 7 + `@prisma/adapter-pg`. Multi-file schema in `prisma/schema/`. Generated client in `src/generated/prisma/`. Import `prisma` — never alias.
- **Styling:** Tailwind v4. `src/shared/lib/globals.css` is the single CSS entry. Light/dark via `.dark` on `<html>`. `cn()` in `src/shared/lib/utils.ts`. Disabled gotcha: `InputGroup` greys the whole group if any descendant is `disabled` (`has-disabled:`); for a control blocked by fixable state use `aria-disabled` instead (skips greying, keeps pointer events so it can trigger its own tooltip). A genuinely disabled control that needs a tooltip needs a span-`render` trigger, since disabled elements swallow pointer events (see `LockedModel`, `ToolsMenu`).
- **LLM:** `src/lib/llm.server.ts`: `streamLLMEvents(opts)` returns `AsyncIterable<StreamChunk>`; include `tools: ServerTool[]` in the options to run the agent loop. A data-driven `PROVIDERS` registry handles per-provider URL/header/model-list/options quirks; provider auto-detected from URL. Wraps `@tanstack/ai`'s `chat()` with native adapters.
- **Tools:** `src/features/send-message/lib/agent.server.ts`: `buildChatTools()` assembles the built-in `ServerTool[]` (web search, memory, skills, search chats) plus MCP server tools; `chat()` auto-executes them. There is **one** chat — no separate "agent mode". Every tool is **opt-in per request**: the client sends the selection via `forwardedProps` (not persisted), so an untouched send hands the model no tools — keeping small models reliable.
- **Chat persistence:** one `Conversation` row = one `UIMessage[]` blob (`messages` JSONB). The **client** owns persistence via `ChatClientPersistence` (`src/features/send-message/lib/chat-client.ts`), so `/api/chat/stream` performs **zero DB writes**.

## Forms

`useAppForm` (TanStack Form) in `src/shared/hooks/use-app-form/`. Field components in `src/shared/hooks/use-app-form/fields/`; never hand-wire `useState`-per-field + `Input` for submit forms. Validate with Zod v4 via `validators: { onDynamic: Schema }`. Submit via `form.handleSubmit()`. Need a new field type? Add a field component, don't hand-wire.

**Submitting:** a form's `onSubmit` awaits a regular `mutation.mutate(value)` — never `mutateAsync`. The mutation owns its feedback: define both `onSuccess` and `onError` on the `useMutation` (firing `toast.success` / `toast.error` there), so submit handlers stay a one-line `await xMutation.mutate(value)` and nothing is wired per-call. Don't surface the same submit error twice — the mutation's `onError` toast is the error channel; reserve inline `FormError` for inline affordances (e.g. a "Test connection" result), not for re-printing the submit mutation's error.

## React & Data Practices

- Derive values during render. Never mirror props or query data into `useState` synced by `useEffect`; effects are only for real external systems (DOM APIs, subscriptions, timers).
- List `key`s come from data ids, never array indexes.
- Mutations invalidate the queries they touch in `onSuccess` via `queryClient.invalidateQueries`; no manual refetching, no local copies of server state.
- Route-level data loads through shared `queryOptions()` used by both the route loader and `useQuery`; components never ad-hoc `fetch`.
- One Zod schema per shape, shared by the form validator and the server fn input; never declare the same shape twice.
- Annotate exported function signatures; let locals and obvious generics infer.

## Code Organization

Four folders, one convention: dependencies flow **one way** `shared → entities → features → routes`. Judgment, not machinery: no layer linter, no barrels.

```
src/
  shared/        # framework-agnostic reusables, zero domain knowledge
    ui/          #   shadcn primitives (flat files, generated) + our own components as subfolders (DataTable/, RouteErrorScreen/)
    lib/         #   utils, crypto/db/llm/auth/session infra (*.server.ts), ollama SDK client, constants, globals.css
    hooks/       #   use-app-form/, use-is-mobile
    theme/       #   ThemeContext provider + theme.ts (app-wide, so shared, not a feature)
  entities/      # domain nouns; server api + schemas + query hooks, files kept flat
    endpoint/    #   the core noun other entities lean on (conversation imports it)
    conversation/   memory/   user-settings/
  features/      # user interactions (verbs), one slice each; keep components/hooks/lib segment folders
    auth/  send-message/  pull-model/  manage-endpoints/  manage-memory/  update-account/
  routes/        # TanStack routing == the pages layer
    _authenticated/
      -components/AppSidebar/       # the shell, colocated (the `-` prefix hides it from route gen)
      -page/{LibraryPage,NewChatView,settings/}
      chat/-page/ConversationPage/
```

- **One-way deps, by convention.** No imports between features; share downward through `entities/` or `shared/`. Cross-entity imports stay rare (`conversation → endpoint` is the only one today). Pages (routes) compose anything below them.
- **Where a new file goes** (first match wins):
  1. Used by exactly one component → that component's folder (colocate by cohesion, not the feature's `hooks/`/`lib/`).
  2. Part of one user interaction → that feature's `components/`/`hooks/`/`lib/`.
  3. Domain data used by two or more features (server fns, schemas, query hooks for a noun) → `entities/<noun>`, files flat.
  4. Domain-free infra or UI (crypto, db, llm, shadcn, form kit) → `shared/`.
  5. Page composition or multi-feature orchestration (a settings tab composing two features) → `routes/**/-page/` beside its route.
- **No per-slice barrel/`index.ts` public API.** Import the specific module (`#/features/send-message/lib/chat-client`), not a slice root. Barrels hurt Vite HMR and tree-shaking. `ComponentName/index.tsx` is a single-component folder, not a re-export barrel.
- **Entities are flat; features keep `components/hooks/lib`.** A feature may be logic-only (`update-account` is a hook plus a schema).
- Large components (250+ lines or with sub-components) become `ComponentName/index.tsx` folders.
- File suffixes are **build-environment boundaries**, not decoration: `*.functions.ts` (the `createServerFn` RPC boundary), `*.server.ts` (server-only, stripped from the client bundle). Type files: `types.ts`; Zod schemas: `schemas.ts`. The `.client.ts` suffix is banned (breaks SSR for isomorphic modules).
- `src/shared/ui/DataTable/`: the only table implementation; never hand-roll `useReactTable`.

### Naming

The mechanical rules (Zod schemas are camelCase values, the `.client.ts` suffix is banned) are enforced by `.claude/hooks/naming-check.ts`. The judgment calls it cannot decide:

- **Slice = the interaction (features) or the noun (entities), not the tab or route.** A verb names a feature (`send-message`, `pull-model`); a domain noun names an entity (`endpoint`, `conversation`). Where a thing goes follows the dependency direction, not where it is used: shared infra that an entity api needs (`getCurrentUserId`, the ollama client) lives in `shared/lib`, never in a feature an entity would have to reach up into.
- **Files:** domain-noun where an entity exists (`conversation.functions.ts`); role-based for infra that is not a model (`db.server.ts`, `llm.server.ts`). Never force infra into an entity name.
- **Server fns:** `list*` returns an array, `get*` a single entity or aggregate, `create*`/`update*`/`delete*` mutate, action verbs (`scan`/`test`/`register`) where CRUD does not fit.
- **Layering verbs:** a helper and the fn wrapping it may differ in verb (`probeEndpoint` becomes `testEndpoint`) but share the noun and never collide on the exact name.
- **Isomorphic client modules** (`auth-client.ts`) keep a plain hyphenated name: `.client.ts`/`.server.ts` are build boundaries that would break their SSR use.
- Tests live in `src/test/<area>/`, run with `npm run test -- run`. See the "Test complex work"
  rule above for when and how.

## Testing

Vitest + Testing Library. Patterns (see the "Test complex work" rule for _when_):

- **Test our seams, not our dependencies.** Target logic we wrote (wiring, input parsing, transforms, registries, merge/normalize); never assert a dependency's own behavior. Litmus: if it would still pass with our code deleted, it tests the library.
- **Extract pure logic, test it plain** (inline inputs, no `render`, no DB): `mergeUserSettings` in `backup.ts`. Beats fighting a library or portal in jsdom.
- **When you must render, query by `data-testid`** (kebab-case, component-scoped, e.g. `model-picker-trigger`), not role/label/text/`className`. The `test-check` hook flags violations. Exception: an element a library renders that won't forward a testid (Streamdown output, a Base UI Slider thumb). The field/DataTable/ModelPicker tests are the reference.
- **Derive minimal inputs inline; never commit recorded fixtures.**

## Feature Map

| Area | Key files |
|------|-----------|
| Chat + streaming | feature `src/features/send-message/` (`lib/agent.server.ts`, `lib/chat-client.ts`), entity `src/entities/conversation/`, page `src/routes/_authenticated/chat/-page/ConversationPage/`, `src/routes/api/chat/stream.tsx` |
| Library (core) | feature `src/features/pull-model/` (`lib/ollama/catalog.server.ts` scrapes ollama.com, `lib/catalog.ts` scores hardware fit, `lib/hardware.server.ts` probes the host), page `src/routes/_authenticated/-page/LibraryPage.tsx`: browse and install local models |
| Endpoints / providers | entity `src/entities/endpoint/` (the kernel: `ModelEndpoint` api, schemas, query hooks), feature `src/features/manage-endpoints/` (the config UI) |
| Memory (pgvector) | `src/shared/lib/tools/manage_memory.ts`, `src/shared/lib/tools/embeddings.server.ts` opt-in per-message tool; entity `src/entities/memory/`, feature `src/features/manage-memory/`, browse/delete in Settings |
| Built-in agent tools | `src/shared/lib/tools/` (`web_search.ts`, `read_url.ts`, `manage_memory.ts`, `catalog.ts`) |
| Settings | page `src/routes/_authenticated/-page/settings/` (tabs compose `update-account`, `manage-memory`, `manage-endpoints`, theme) |
| Backup/import | `src/routes/api/backup/`: non-destructive merge |
| Auth | feature `src/features/auth/` (UI + sign-in/out fns), session infra `src/shared/lib/{auth,session}.server.ts` |
| Theme | `src/shared/theme/` (provider + constants), Appearance tab in Settings |
