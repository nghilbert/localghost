# CLAUDE.md

Guidance for Claude Code working in this repository.

## Non-negotiable Rules

- **Work with the framework:** never hand-roll what a *retained* dependency does; no parallel implementation, bridge, or shim running *alongside* a library we keep. Adopt the library's native model (types, persistence, helpers) even if the diff grows. Implementing a library's own documented extension point (e.g. `@tanstack/ai`'s `ServerTool`) against our backend counts as adoption, not a shim. First-party components that replace a dropped dependency outright (e.g. `message-scroller.tsx`, our own scroll-anchoring code after removing `@shadcn/react`) are ours to own, not shims. The test is whether the logic duplicates a library still in the tree.
- **Base UI + tailwind-variants:** compose `@base-ui/react/*` primitives directly; no raw HTML where a primitive exists, no shadcn CLI, no `components.json`, no registry regeneration. `src/shared/components/ui/*` is fully hand-owned. Compose with the `render={<El/>}` prop (Base UI's `asChild`). Style component variants with `tv` from `tailwind-variants` (its `VariantProps` type, tailwind-merge built in); `cn()` from `#/shared/lib/utils` stays as the general conditional-merge utility for classes outside a `tv` config. Themeable via CSS variables only, no hardcoded colors. `field.tsx` (rebuilt on Base UI `Field` primitives) is the precedent for leaning on primitive behavior. Don't delete or prune an unused `ui/` primitive (or the dependency it pulls in) just because nothing imports it yet; it's there for the next feature.
- **Prisma:** every model ID is `@id @default(dbgenerated("uuidv7()")) @db.Uuid`, auth tables included. On this adapter better-auth's `generateId: "uuid"` leaves `id` to Postgres, so that default is load-bearing. All FKs `@db.Uuid`; all camelCase fields `@map("snake_case")`.
- **Biome:** never `biome-ignore`; fix the real issue.
- **Server-only:** never import `.server.ts` from client code.
- **Comments:** only for non-obvious behavior. Exported functions get JSDoc; add `@param`/`@returns`/`@throws`/`{@link}` tags only where they add what the name and type don't. Describe the code as it is, to a reader who wasn't in the room. That rules out four things beyond PR history: defending the code against an alternative you rejected, citing where you learned something ("confirmed by reading its source"), a count that goes stale ("a four-instruction Dockerfile"), and restating setup the README owns. Rationale goes in the commit message, not the file.
- **No `as` casts:** type via generics, annotations, or Prisma model types. `as const` is fine, it asserts a literal type rather than overriding one.
- **No positional params:** two or more params means one named object (one positional is fine); better, remove the boundary so the value is read from its owner.
- **No dead code:** delete unused code; no re-exports, no `// removed` comments.
- **Components own their styling:** an ad-hoc card surface in feature code is a `<Card>`, not a raw `<div className="rounded-lg border bg-card p-4">`. Reach for `className` only for layout the component cannot do itself.
- **Layout-agnostic components:** reusable components never set their own width, max-width, margins, outer flex/grid placement, or page-height assumptions; the parent owns the space it offers, while the child owns only its internal layout. Mechanism: accept `className` and merge it with `cn(defaults, className)` onto the element that owns the concern, the way every `ui/*` primitive already does (`field.tsx`, etc.); never hardcode a layout class the caller cannot override. If a component wraps two elements whose layout differs (e.g. an outer `<form>` and an inner content group), give the outer one its own distinctly named prop (e.g. `formClassName`) rather than pointing one `className` at both.
- **Post-action toasts:** after user-awaited mutations, fire `toast.add({ title, type })` (`"success"`/`"error"`) from `#/shared/components/ui/toast` (Base UI Toast, mounted once as `<Toaster/>` in `__root.tsx`).
- **Test complex work:** for real moving parts (parsers, data transforms, non-trivial UI), write Vitest tests in `src/test/<area>/` asserting real behavior. Keep test data inline or tiny; craft the minimal input, never commit captured blobs.

## Project Purpose

A modern, local-first AI chat app: install any model you want (local via llama.cpp, or a bring-your-own cloud endpoint) and chat with it, as polished as the big brands but yours. The **Library** is the core surface (browse and install models, then chat). Capabilities are **inline tools, never tabs**: web search and a long-term **Memory** live inside chat, toggled per message.

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

**The dev loop is Docker Compose; `.env` selects the environment.** `docker compose up --build` reads `COMPOSE_PROFILES` and `COMPOSE_FILE` from `.env`, so switching environments means editing `.env`, not the command. Profiles: `dev` runs Vite with HMR over a bind mount (`web-dev` service), `prod` serves the built image (`web`), and `llamacpp` adds a bundled llama.cpp (llama-server, router mode). `dev` and `prod` are mutually exclusive: both bind port 3000. `COMPOSE_FILE` overlays (`compose.nvidia.yaml` / `compose.amd.yaml` / `compose.vulkan.yaml`) add GPU access. See `.env.example` / `README.md`.

Under the `dev` profile the npm commands above run inside the container, e.g. `docker compose exec web-dev npm run prisma -- migrate dev --name <name>`.

**Native fallback:** `docker compose up db -d` then `npm run dev` runs the app on the host against the Dockerized Postgres.

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
- **Routes = the pages layer.** `_authenticated.tsx` guards auth and renders the colocated `AppSidebar` shell. A route file owns the `Route` export (loader/head/search) and its page component `<RouteSubject>Page` (`library.tsx` defines `LibraryPage`). Pathless layout routes own shared geometry or behavior without changing public URLs (`_authenticated/_chat/route.tsx` wraps `/new` and `/chat/$id`). Code local to a route lives in kind-based `-`-prefixed segments hidden from route gen (`-components/`, `-hooks/`, `-lib/`): beside a single route file (`library.tsx` + `library/-components/`), inside a route directory (`settings/index.tsx` + `settings/-components/`), or under the **common route ancestor** that shares it (`_authenticated/_chat/-components/` serves the chat subtree; `_authenticated/-components/AppSidebar/` serves every authenticated page). A `-components/` folder is fine with a single member. Server-only logic shared by sibling API route handlers is one `-<name>.server.ts` file (`api/backup/-backup.server.ts`).
- **Auth:** better-auth (email/password); session resolved at root `beforeLoad`.
- **Data:** TanStack Query + `createServerFn` in co-located `*.functions.ts`, called as `fn({ data })`. A `*.functions.ts` is a thin RPC boundary: validate input, resolve the user, delegate to the sibling `<noun>.server.ts` (owns prisma/crypto/external calls); `queryOptions` colocate at the file bottom. `shared/domain/memory` is the reference split.
- **Database:** Prisma 7 + `@prisma/adapter-pg`. Multi-file schema in `prisma/schema/`, client in `src/generated/prisma/`. Import `prisma`, never alias.
- **Styling:** Tailwind v4; `src/shared/lib/globals.css` is the single CSS entry. Light/dark via `.dark` on `<html>` (`@theme inline` maps `:root`/`.dark` OKLCH vars to tokens, Geist as `--font-sans`). Component variants use `tv` from `tailwind-variants`; `cn()` in `src/shared/lib/utils.ts` for general merging. Our own `src/shared/lib/tailwind-utilities.css` (vendored, hand-owned) provides the `data-*` custom variants, the `scroll-fade` family, and `shimmer`. Gotcha: `InputGroup` greys the whole group if any descendant is `disabled` (`has-disabled:`); for a control blocked by fixable state use `aria-disabled` (skips greying, keeps pointer events for its own tooltip). A genuinely disabled control that needs a tooltip needs a span-`render` trigger, since disabled elements swallow pointer events (see `LockedModel`, `ToolsMenu`).
- **LLM:** `src/shared/lib/llm.server.ts`: `streamLLMEvents(opts)` returns `AsyncIterable<StreamChunk>`; pass `tools: ServerTool[]` to run the agent loop. A data-driven `PROVIDERS` registry handles per-provider URL/header/model-list/options quirks, provider auto-detected from URL. Wraps `@tanstack/ai`'s `chat()`.
- **Tools:** `agent.server.ts` `buildChatTools()` assembles the `ServerTool[]` `chat()` auto-executes. The client exposes **one** toggle, `web_search` (the only entry in `tool-catalog.ts`'s `TOOL_CATALOG`); enabling it activates both `web_search` and `read_url` server-side (they ship as a pair). Memory's tools (`manage_memory`, `delete_memory`) are not here; they ride in via `memoryMiddleware`'s adapter, since memory is always-on. One chat, no separate "agent mode". Client sends the per-request selection via `forwardedProps` (not persisted). Web search starts enabled whenever the server offers it (`SEARXNG_URL` set, via `getToolAvailability`); every other tool starts off, keeping small models reliable.
- **Chat persistence:** `@tanstack/ai-persistence`'s `withPersistence` is server-authoritative: the transcript lives in `ChatThread` (keyed by `Conversation.id` as `threadId`), run/interrupt lifecycle in `ChatRun`/`ChatInterrupt` (`chat-persistence.server.ts`). The client runs `useChat({ persistence: true })` with no local cache; `/api/chat/stream`'s GET branches on `?threadId=` (hydrate via `reconstructChat`) vs. a resumable-stream rejoin.

## Forms

`useAppForm` (TanStack Form) in `src/shared/hooks/use-app-form/`, field components in its `fields/`. The hook, its form components, and its private field components stay together as one form kit. Never hand-wire `useState`-per-field + `Input`; add a field component instead. Validate with Zod v4 via `validators: { onDynamic: Schema }`; submit via `form.handleSubmit()`.

Extract a page-local form when it owns an independent validation, submission, and reset/close lifecycle; colocate it with its route. Reuse alone is not required, and a form's private pieces do not become shared components. Keep surrounding search, list, and dialog composition in the parent screen unless those pieces gain their own responsibility.

**Submitting:** completion-dependent forms return `mutation.mutateAsync(value, { onSuccess })` directly from `onSubmit`; no unnecessary `async`/`await`, result variable, `void result`, or local `try/catch`. The hook-level `onSuccess` awaits invalidation and owns the shared success toast; hook-level `onError` owns the single error toast. Per-call `onSuccess` is only for component-local reset, close, navigation, or callbacks. At a DOM form-event boundary, consume `form.handleSubmit()`'s rejected promise after TanStack Form updates its state so it does not become an unhandled browser rejection. Fire-and-forget button actions use `mutate`. Reserve inline `FormError` for inline affordances (a "Test connection" result), not the submit mutation's error.

## React & Data Practices

- Derive values during render. Never mirror props or query data into `useState` synced by `useEffect`; effects are only for real external systems (DOM APIs, subscriptions, timers).
- Read context with `use(Context)`, never `useContext` (`ThemeContext.tsx`). Subscribe to a browser store (matchMedia and the like) with `useSyncExternalStore`, not `useState` + a listener in `useEffect` (`use-is-mobile.ts` is the precedent).
- Pass `ref` as a plain prop, or use Base UI's `render`, never `forwardRef` (deprecated in React 19). Biome's `react` domain, auto-enabled by the `react` dependency, already enforces effect-dependency correctness.
- **React Compiler is on** (official `babel-plugin-react-compiler` via `@rolldown/plugin-babel`): it memoizes for us, so don't hand-write `useMemo`/`useCallback`. Define the value plainly, unless an external API needs a stable reference the compiler can't provide.
- List `key`s come from data ids, never array indexes.
- Mutations invalidate the queries they touch in `onSuccess` via `queryClient.invalidateQueries`; no manual refetching, no local copies of server state.
- Domain query/mutation hooks are focused exports grouped in the existing noun hook file (`use-endpoints.ts`, `use-conversations.ts`); never create one file per operation or an aggregate hook that instantiates unused observers.
- Route-level data loads through shared `queryOptions()` used by both the route loader and `useQuery`; components never ad-hoc `fetch`. Every route with queries defines a loader: `context.queryClient.ensureQueryData(...)` (awaited) for fast first-paint data, an un-awaited `prefetchQuery(...)` for slow scans the page already renders skeletons for.
- One Zod schema per shape, shared by the form validator and the server fn input; never declare the same shape twice.
- Annotate exported function signatures; let locals and obvious generics infer.

## Code Organization

`src/` has four top-level folders (`generated/`, `routes/`, `shared/`, `test/`); the load-bearing convention is that dependencies flow **one way** `shared → routes`. Judgment, not machinery: no layer linter, no barrels.

```
src/
  generated/       # Prisma client output (src/generated/prisma/); never edit, regenerate instead
  shared/          # everything used app-wide, not tied to one page
    domain/        #   domain nouns, one folder each; files named for what they own: <noun>.server.ts (data access) + <noun>.functions.ts (thin RPC + queryOptions) + schemas.ts/types.ts + use-<noun>.ts hooks + any UI shared across routes
      endpoint/    #     the kernel other nouns lean on (conversation/memory/model-setting import it)
      conversation/  chat/  memory/  model/  model-setting/  user-settings/  auth/  backup/
    components/    #   reusable components: ui/ (hand-owned Base UI primitives, flat) + our own (RouteErrorScreen/, ActivityMarker)
    lib/           #   domain-free infra, server and isomorphic: crypto/db/llm/auth/session (*.server.ts), llama.cpp client + url, tools/, constants, format/utils, globals.css + themes/
    hooks/         #   use-app-form/, use-is-mobile, use-sign-out
    theme/         #   ThemeContext provider + theme.ts
  router.ts  routeTree.gen.ts   # router config; generated route tree (never edit)
  routes/          # TanStack routing == the pages layer; each route file owns Route + its <X>Page component
    _public/
      -components/                      # SignInForm, SignUpForm (local to the public pages)
    _authenticated/
      -components/AppSidebar/  -components/ChatInput/  -components/ChatMessage/  -hooks/  # shared by every authenticated page (ChatInput/ChatMessage, use-step-duration, use-endpoint-model-groups)
      _chat/                             # pathless layout shared by /new and /chat/$id
        route.tsx  new.tsx  chat/$conversationId.tsx
        -components/  -hooks/  -lib/     # code owned only by the chat route subtree
      library.tsx  library/-components/ library/-lib/   # the Library page UI
      settings/                         # a route directory: index.tsx + -components/ -hooks/ -lib/
    api/
      chat/stream.ts  models/events.ts  auth/$.ts  backup/{export,import}.ts + -backup.server.ts   # server routes are .ts (no JSX)
  test/              # Vitest, mirrors the shared/domain and routes slices it tests (see Testing)
```

- **Two layers, by convention.** Everything app-wide lives in `shared/`; `routes/` is URL-addressable pages plus the code colocated to them. Routes import `shared`; **`shared/` never imports `routes/`**. Within `shared/domain`, cross-noun imports stay rare (`conversation`/`memory`/`model-setting` importing `endpoint` is the sanctioned edge).
- **Where a new file goes — three tiers** (first match wins): (1) used by **one page** → that route's `-components`/`-hooks`/`-lib`; (2) shared by a **subtree of routes** → create or use their common layout route and keep its code beneath that route (`_authenticated/_chat/-components/`); shell UI shared by every authenticated route stays at `_authenticated/-components/`; (3) used **app-wide** — by unrelated routes, an API route, or another domain noun → `shared/`: domain data and its shared UI in `shared/domain/<noun>`, domain-free infra in `shared/lib`, reusable domain-free UI in `shared/components`. A `.server.ts` an API route imports always goes to `shared` (an API route must not reach into another route's `-lib`).
- **`-` folders are non-route colocation, not a shared layer.** TanStack's `routeFileIgnorePrefix` (`-`) hides them from route generation; import by alias (`#/routes/_authenticated/-components/ChatInput`) or relative (`./-components/X`). App-wide code belongs in `shared/`, never buried under `routes/-shared`. Three route-name affixes do distinct jobs, don't conflate them: `_prefix` = pathless layout (adds a layout/geometry wrapper, no URL segment, e.g. `_chat`); `(folder)` = route group (organizes sibling routes with no layout and no URL segment); `-prefix` = excluded from the route tree entirely (colocation). Reach for `(folder)` when you want grouping without a shared component.
- **No barrels.** Import the specific module (`#/routes/_authenticated/_chat/-lib/chat-client`), not a slice root; barrels hurt Vite HMR and tree-shaking, and a barrel that mixes safe exports with `.server` ones is a real client-bundle leak path (Start's import-protection guide, "Mixed Barrels and Split Entry Points"), not just a build-speed nit. `ComponentName/index.tsx` is a single component, not a re-export.
- **`shared/domain` is flat per noun; route colocation uses `-components`/`-hooks`/`-lib`.** Components at 250+ lines or with sub-components become `ComponentName/index.tsx` folders.
- **File suffixes are build boundaries:** `*.functions.ts` (the `createServerFn` RPC boundary), `*.server.ts` (server-only, stripped from the client bundle); `types.ts` for types, `schemas.ts` for Zod. The `.client.ts` suffix is banned (breaks SSR for isomorphic modules).
### Naming

The mechanical rules (camelCase Zod schemas, the banned `.client.ts` suffix) are enforced by `.claude/hooks/post-edit.ts`. The judgment calls it cannot decide:

- **Slice = the domain noun (`shared/domain/<noun>`) or the page/subtree (routes), not the tab.** A noun names a domain folder (`endpoint`, `conversation`, `chat`, `model`); page-local code is named by its route area. Placement follows dependency direction, not usage: infra a domain noun needs (`getCurrentUserId`, the llama.cpp client) lives in `shared/lib`, and page UI that uses a noun lives in the route — never the reverse.
- **Files:** domain-noun in `shared/domain` (`conversation.functions.ts`); role-based for domain-free infra (`db.server.ts`, `llm.server.ts`).
- **Server fns:** `list*` returns an array, `get*` a single entity or aggregate, `create*`/`update*`/`delete*` mutate, action verbs (`scan`/`test`/`register`) where CRUD does not fit.
- **Layering verbs:** a helper and its wrapping fn may differ in verb (`probeEndpoint` becomes `testEndpoint`) but share the noun and never collide on the exact name.
- **Components name their role, never their primitive.** Four tiers: (1) **primitives** — `shared/components/ui/*`, Base UI wrappers, kebab-case, named after the primitive (the only place a primitive name is right); (2) **components** — route `-components/` and shared (`shared/domain/<noun>`, `shared/components/`), PascalCase named after their domain role with a suffix that says what the thing *is* (`Form`, `Card`, `Panel`, `List`, `Item`, `Menu`, `Badge`, `Picker`, `Preview`, `Button`, `Status`, `Controls`, `Filter`, `Nav`, `Step`, `Marker`, `Trail`, `Screen`, `Cell` — extend deliberately); (3) **views** — page-region compositions, suffix `View` (`ChatView`), or `Tab` for a tab panel (`AccountTab`), or `Panel` for a bounded sub-region (`ModelDetailPanel`); (4) **pages** — `<Subject>Page`, inline in the route module (`LibraryPage`). Never suffix by the shadcn primitive a component happens to wrap: the suffix may coincide with a primitive for a thin wrapper (`HardwareCard` is a Card), but the discriminator is the role, not the import — a multi-primitive component (`ChatInput`) has no primitive to name. A bare domain noun with no role suffix is allowed only when the noun makes the role self-evident and a suffix would read worse (the chat triad `ChatView`/`ChatMessage`/`ChatInput`; established product terms like `NotificationCenter`); everything else carries a suffix.

## Testing

Vitest in `src/test/<area>/` (folders named for the slice they test: the domain noun or route area, e.g. `chat/`, `model/`, `endpoint/`, `settings/`, never by test type), run with `npm run test -- run` (see the "Test complex work" rule for _when_). Two projects split by extension: `*.test.ts` runs in node (`unit`), `*.test.tsx` in headless Chromium via browser mode (`browser`). Browser tests use `render`/`renderHook` from `#/test/utils` (wraps `vitest-browser-react`; both async), interactions via locators (`await screen.getByTestId(...).click()`) or `userEvent` from `vitest/browser`, assertions via `await expect.element(...)` / `expect.poll`. `.claude/hooks/post-edit.ts` enforces the mechanical patterns (userEvent over `fireEvent`, no casts, query by `data-testid` not role/label/text). The judgment:

- **Test our seams, not our dependencies.** Target logic we wrote (wiring, input parsing, transforms, registries, merge/normalize). Litmus: if it would still pass with our code deleted, it tests the library.
- **Extract pure logic, test it plain** (inline inputs, no `render`, no DB): `toolRows` in `ToolsMenu.tsx`. A `.test.ts` in node beats a browser render it doesn't need.
- `data-testid` is kebab-case and component-scoped (`model-picker-trigger`); the field/ModelPicker tests are the reference. The testid exception: an element a library renders that won't forward one (Streamdown output, a Base UI Slider thumb).
- Folder = slice: `src/test/model/` tests model code (`shared/domain/model` + the Library UI), `src/test/endpoint/` tests `src/shared/domain/endpoint/`, `src/test/chat/` tests the chat surface. Domain-free infra mirrors its `shared/` folder name, not a test-type name: `src/test/lib/` for `shared/lib`, `src/test/hooks/` for `shared/hooks` (`src/test/lib/llamacpp-url.test.ts`, `src/test/hooks/use-app-form.test.tsx`). There is no `src/test/components/`; a component's test goes in its slice folder (`NotificationCenter` under `src/test/model/`, since it renders download state).
- **Derive minimal inputs inline; never commit recorded fixtures.**

## Feature Map

| Area | Key files |
|------|-----------|
| Chat + streaming | pathless layout and client surface `src/routes/_authenticated/_chat/` (`route.tsx`, `/new` and `/chat/$id` pages, `-components/`, `-hooks/`, `-lib/`), shared `ChatInput`/`ChatMessage` and the `use-step-duration`/`use-endpoint-model-groups` hooks under `_authenticated/-components/`/`-hooks/`, server orchestration `src/shared/domain/chat/` (`agent.server.ts`, `system-prompt.ts`, `tools.functions.ts`, `tool-definitions.ts`, `resolve-generation-options.ts`), persisted `src/shared/domain/conversation/`, `src/routes/api/chat/stream.ts` |
| Library (core) | data `src/shared/domain/model/` (`catalog.server.ts` reads the Hugging Face GGUF index via `huggingface.server.ts`, `hardware.server.ts` probes the host, `hardware-fit.ts` scores fit, `model.functions.ts`), page UI `src/routes/_authenticated/library.tsx` + `library/-components/ModelList/`: browse and install local models |
| Endpoints / providers | domain `src/shared/domain/endpoint/` (the kernel: endpoint api, schemas, query hooks), config UI `src/routes/_authenticated/settings/-components/` (`EndpointItem`, `ProviderSetupForm/`) + `-lib/providers.ts` registry |
| Memory (pgvector) | `src/shared/domain/memory/` (`memory.functions.ts` RPC, `memory.server.ts` pgvector semantic recall via `embeddings.server.ts`, `memory-tool.server.ts` the `manage_memory`/`delete_memory` tool bodies, `memory-adapter.server.ts` the `MemoryAdapter` `memoryMiddleware` runs); always-on middleware (not a per-message toggle), browse/delete in Settings |
| Built-in agent tools | wired in `src/shared/domain/chat/agent.server.ts` (the `web_search` toggle activates both `web_search` and `read_url`) plus `memory-adapter.server.ts`'s always-on memory tools; handlers in `src/shared/lib/tools/{web-search,read-url}.server.ts`; single client toggle in `src/routes/_authenticated/_chat/-lib/tool-catalog.ts`, availability in `src/shared/domain/chat/tools.functions.ts` |
| Settings | page `src/routes/_authenticated/settings/` (`index.tsx` + `-components/` tabs + `-hooks/` + `-lib/`: account, memory, endpoints, theme, backup) |
| Backup/import | `src/routes/api/backup/` (handlers + colocated `-backup.server.ts`): non-destructive merge |
| Auth | forms `src/routes/_public/-components/`, RPC `src/shared/domain/auth/` (`auth.functions.ts`, `schemas.ts`), `use-sign-out` in `shared/hooks`, session infra `src/shared/lib/{auth,session}.server.ts` |
| Theme | `src/shared/theme/` (provider + constants), Appearance tab in Settings |
