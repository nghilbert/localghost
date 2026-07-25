# CLAUDE.md

Guidance for Claude Code working in this repository.

## Non-negotiable Rules

- **Work with the framework:** never hand-roll what a dependency does; no parallel implementation, bridge, or shim. Adopt the library's native model (types, persistence, helpers) even if the diff grows. Implementing a library's own documented extension point (e.g. `@tanstack/ai`'s `ServerTool`) against our backend counts as adoption, not a shim — a shim is hand-rolled logic running *alongside* the library instead of through it.
- **shadcn-first:** compose shadcn primitives (consult the MCP registry); no raw HTML where a shadcn equivalent exists, no forking `ui/`. Stack is shadcn on Base UI (`@base-ui/react/*`), not Radix: compose with the `render={<El/>}` prop (Base UI's `asChild`). Themeable via CSS variables only, no hardcoded colors. `src/shared/components/ui/*` is registry output: prefer regenerating (`npx shadcn@latest add <component> --overwrite`) over hand-editing; rare, stated-reason hand-edits are fine (`sonner.tsx`'s `ThemeContext` wiring is the precedent).
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

A modern, local-first AI chat app: install any model you want (local via Ollama, or a bring-your-own cloud endpoint) and chat with it, as polished as the big brands but yours. The **Library** is the core surface (browse and install models, then chat). Capabilities are **inline tools, never tabs**: web search and a long-term **Memory** live inside chat, toggled per message.

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
- Never edit generated output (`src/generated/`, `routeTree.gen.ts`); change the source and regenerate.
- When delegating to sub agents, prefer a smaller/cheaper model (e.g. `haiku`) for mechanical or narrow-scope tasks (targeted search, single-file edits); reserve the default or larger models for non-trivial reasoning or design work.

## Environment

Copy `.env.example` to `.env`. Required: `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET`, `ENCRYPTION_KEY` (64-char hex). `DATABASE_URL` is a single `.env` line interpolated from `POSTGRES_*` by dotenvx; DB-touching scripts run through `dotenvx run`. Optional: `SEARXNG_URL` (unset disables web search with a guidance message).

## Architecture

- **Framework:** TanStack Start (SSR React, Vite + Hono); file-based routing. Alias `#/` maps to `src/`.
- **Routes = the pages layer.** `_authenticated.tsx` guards auth and renders the colocated `AppSidebar` shell. A route file owns the `Route` export (loader/head/search) and its page component `<RouteSubject>Page` (`library.tsx` defines `LibraryPage`). Code local to a route lives in kind-based `-`-prefixed segments hidden from route gen (`-components/`, `-hooks/`, `-lib/`): beside a single route file (`library.tsx` + `library/-components/`), inside a route directory (`settings/index.tsx` + `settings/-components/`), or at the **common ancestor** of the routes that share it (`_authenticated/-components/chat/` serves both `/new` and `/chat/$id`; `_authenticated/-components/AppSidebar/` serves every authenticated page). A `-components/` folder is fine with a single member. Server-only logic shared by sibling API route handlers is one `-<name>.server.ts` file (`api/backup/-backup.server.ts`).
- **Auth:** better-auth (email/password); session resolved at root `beforeLoad`.
- **Data:** TanStack Query + `createServerFn` in co-located `*.functions.ts`, called as `fn({ data })`. A `*.functions.ts` is a thin RPC boundary: validate input, resolve the user, delegate to the sibling `<noun>.server.ts` (owns prisma/crypto/external calls); `queryOptions` colocate at the file bottom. `shared/domain/memory` is the reference split.
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

Two top-level folders, one convention: dependencies flow **one way** `shared → routes`. Judgment, not machinery: no layer linter, no barrels.

```
src/
  shared/          # everything used app-wide, not tied to one page
    domain/        #   domain nouns, flat per noun: <noun>.server.ts (data access) + <noun>.functions.ts (thin RPC + queryOptions) + schemas.ts/types.ts + use-<noun>.ts hooks + any UI shared across routes
      endpoint/    #     the kernel other nouns lean on (conversation/memory/model-setting import it)
      conversation/  chat/  memory/  model/  model-setting/  user-settings/  auth/
    components/    #   reusable components: ui/ (shadcn primitives, generated, flat) + our own (DataTable/, RouteErrorScreen/)
    lib/           #   domain-free infra (*.server.ts): crypto/db/llm/auth/session, ollama SDK client + url, tools/, constants, globals.css
    hooks/         #   use-app-form/, use-is-mobile, use-sign-out
    theme/         #   ThemeContext provider + theme.ts
  routes/          # TanStack routing == the pages layer; each route file owns Route + its <X>Page component
    _public/
      -components/                      # SignInForm, SignUpForm (local to the public pages)
    _authenticated/
      -components/AppSidebar/           # the shell, shared by every authenticated page
      -components/chat/  -hooks/  -lib/ # the chat surface, shared by /new and /chat/$id (their common ancestor)
      library.tsx  library/-components/ library/-lib/   # the Library page UI
      settings/                         # a route directory: index.tsx + -components/ -hooks/ -lib/
    api/
      chat/stream.tsx  backup/-backup.server.ts
```

- **Two layers, by convention.** Everything app-wide lives in `shared/`; `routes/` is URL-addressable pages plus the code colocated to them. Routes import `shared`; **`shared/` never imports `routes/`**. Within `shared/domain`, cross-noun imports stay rare (`conversation`/`memory`/`model-setting` importing `endpoint` is the sanctioned edge).
- **Where a new file goes — three tiers** (first match wins): (1) used by **one page** → that route's `-components`/`-hooks`/`-lib`; (2) shared by a **subtree of routes** → the common-ancestor `-` folder (chat UI at `_authenticated/-components/chat/`, `AppSidebar` at `_authenticated/-components/`); (3) used **app-wide** — by unrelated routes, an API route, or another domain noun → `shared/`: domain data and its shared UI in `shared/domain/<noun>`, domain-free infra in `shared/lib`, reusable domain-free UI in `shared/components`. A `.server.ts` an API route imports always goes to `shared` (an API route must not reach into another route's `-lib`).
- **`-` folders are non-route colocation, not a shared layer.** TanStack's `routeFileIgnorePrefix` (`-`) hides them from route generation; import by alias (`#/routes/_authenticated/-components/chat/ChatView`) or relative (`./-components/X`). App-wide code belongs in `shared/`, never buried under `routes/-shared`.
- **No barrels.** Import the specific module (`#/routes/_authenticated/-lib/chat-client`), not a slice root; barrels hurt Vite HMR and tree-shaking. `ComponentName/index.tsx` is a single component, not a re-export.
- **`shared/domain` is flat per noun; route colocation uses `-components`/`-hooks`/`-lib`.** Components at 250+ lines or with sub-components become `ComponentName/index.tsx` folders.
- **File suffixes are build boundaries:** `*.functions.ts` (the `createServerFn` RPC boundary), `*.server.ts` (server-only, stripped from the client bundle); `types.ts` for types, `schemas.ts` for Zod. The `.client.ts` suffix is banned (breaks SSR for isomorphic modules).
- `src/shared/components/DataTable/` is the only table; never hand-roll `useReactTable`.

### Naming

The mechanical rules (camelCase Zod schemas, the banned `.client.ts` suffix) are enforced by `.claude/hooks/text-check.ts`. The judgment calls it cannot decide:

- **Slice = the domain noun (`shared/domain/<noun>`) or the page/subtree (routes), not the tab.** A noun names a domain folder (`endpoint`, `conversation`, `chat`, `model`); page-local code is named by its route area. Placement follows dependency direction, not usage: infra a domain noun needs (`getCurrentUserId`, the ollama client) lives in `shared/lib`, and page UI that uses a noun lives in the route — never the reverse.
- **Files:** domain-noun in `shared/domain` (`conversation.functions.ts`); role-based for domain-free infra (`db.server.ts`, `llm.server.ts`).
- **Server fns:** `list*` returns an array, `get*` a single entity or aggregate, `create*`/`update*`/`delete*` mutate, action verbs (`scan`/`test`/`register`) where CRUD does not fit.
- **Layering verbs:** a helper and its wrapping fn may differ in verb (`probeEndpoint` becomes `testEndpoint`) but share the noun and never collide on the exact name.
- **Components name their role, never their primitive.** Four tiers: (1) **primitives** — `shared/components/ui/*`, shadcn, kebab-case, named after the primitive (the only place a primitive name is right); (2) **components** — route `-components/` and shared (`shared/domain/<noun>`, `shared/components/`), PascalCase named after their domain role with a suffix that says what the thing *is* (`Form`, `Card`, `Panel`, `List`, `Item`, `Menu`, `Badge`, `Picker`, `Preview`, `Button`, `Status`, `Controls`, `Filter`, `Nav`, `Step`, `Marker`, `Trail`, `Screen`, `Cell` — extend deliberately); (3) **views** — page-region compositions, suffix `View` (`ChatView`), or `Tab` for a tab panel (`AccountTab`), or `Panel` for a bounded sub-region (`ModelDetailPanel`); (4) **pages** — `<Subject>Page`, inline in the route module (`LibraryPage`). Never suffix by the shadcn primitive a component happens to wrap: the suffix may coincide with a primitive for a thin wrapper (`HardwareCard` is a Card), but the discriminator is the role, not the import — a multi-primitive component (`ChatInput`) has no primitive to name. A bare domain noun with no role suffix is allowed only when the noun makes the role self-evident and a suffix would read worse (the chat triad `ChatView`/`ChatMessage`/`ChatInput`; established product terms like `NotificationCenter`); everything else carries a suffix.

## Testing

Vitest in `src/test/<area>/` (folders named for the slice they test: the domain noun or route area, e.g. `chat/`, `model/`, `endpoint/`, `settings/`, never by test type), run with `npm run test -- run` (see the "Test complex work" rule for _when_). Two projects split by extension: `*.test.ts` runs in node (`unit`), `*.test.tsx` in headless Chromium via browser mode (`browser`). Browser tests use `render`/`renderHook` from `#/test/utils` (wraps `vitest-browser-react`; both async), interactions via locators (`await screen.getByTestId(...).click()`) or `userEvent` from `vitest/browser`, assertions via `await expect.element(...)` / `expect.poll`. `.claude/hooks/text-check.ts` enforces the mechanical patterns (userEvent over `fireEvent`, no casts, query by `data-testid` not role/label/text). The judgment:

- **Test our seams, not our dependencies.** Target logic we wrote (wiring, input parsing, transforms, registries, merge/normalize). Litmus: if it would still pass with our code deleted, it tests the library.
- **Extract pure logic, test it plain** (inline inputs, no `render`, no DB): `toolRows` in `ToolsMenu.tsx`. A `.test.ts` in node beats a browser render it doesn't need.
- `data-testid` is kebab-case and component-scoped (`model-picker-trigger`); the field/DataTable/ModelPicker tests are the reference. The testid exception: an element a library renders that won't forward one (Streamdown output, a Base UI Slider thumb).
- Folder = slice: `src/test/model/` tests model code (`shared/domain/model` + the Library UI), `src/test/endpoint/` tests `src/shared/domain/endpoint/`, `src/test/chat/` tests the chat surface. Domain-free infra keeps its `shared/lib` name (`src/test/lib/ollama-url.test.ts`).
- **Derive minimal inputs inline; never commit recorded fixtures.**

## Feature Map

| Area | Key files |
|------|-----------|
| Chat + streaming | chat UI `src/routes/_authenticated/-components/chat/` + `-hooks/` + `-lib/chat-client.ts`, server orchestration `src/shared/domain/chat/` (`agent.server.ts`, `system-prompt.ts`, `tools.functions.ts`), persisted `src/shared/domain/conversation/`, pages `src/routes/_authenticated/{new.tsx,chat/$conversationId.tsx}`, `src/routes/api/chat/stream.tsx` |
| Library (core) | data `src/shared/domain/model/` (`catalog.server.ts` scrapes ollama.com, `hardware.server.ts` probes the host, `pull-registry.server.ts`, `model.functions.ts`), page UI `src/routes/_authenticated/library.tsx` + `library/-components/ModelTable/` + `library/-lib/catalog.ts` (scores hardware fit): browse and install local models |
| Endpoints / providers | domain `src/shared/domain/endpoint/` (the kernel: endpoint api, schemas, query hooks), config UI `src/routes/_authenticated/settings/-components/` (`EndpointItem`, `ProviderSetupForm/`) + `-lib/providers.ts` registry |
| Memory (pgvector) | `src/shared/domain/memory/` (`memory.functions.ts` RPC, `memory.server.ts` data access, `memory-tool.server.ts` agent tool, `embeddings.server.ts`); opt-in per-message tool, browse/delete in Settings |
| Built-in agent tools | wired in `src/shared/domain/chat/agent.server.ts`; handlers in `src/shared/lib/tools/{web-search,read-url}.server.ts` + `src/shared/domain/memory/memory-tool.server.ts`; client toggle list in `src/routes/_authenticated/-lib/tool-catalog.ts`, availability in `src/shared/domain/chat/tools.functions.ts` |
| Settings | page `src/routes/_authenticated/settings/` (`index.tsx` + `-components/` tabs + `-hooks/` + `-lib/`: account, memory, endpoints, theme, backup) |
| Backup/import | `src/routes/api/backup/` (handlers + colocated `-backup.server.ts`): non-destructive merge |
| Auth | forms `src/routes/_public/-components/`, RPC `src/shared/domain/auth/` (`auth.functions.ts`, `schemas.ts`), `use-sign-out` in `shared/hooks`, session infra `src/shared/lib/{auth,session}.server.ts` |
| Theme | `src/shared/theme/` (provider + constants), Appearance tab in Settings |
