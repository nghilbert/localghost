# Architecture

This document describes the shape of localghost: where things are, and the rules that hold between them. It is for people changing the code. The details live in the code and its JSDoc.

## Bird's-eye view

A user signs in, picks a model, and chats. A model is either installed locally, a GGUF file served by the bundled llama.cpp, or a cloud endpoint the user adds. Chat runs on the server through TanStack AI, which streams the reply and calls tools: web search through SearXNG, and long-term memory. Everything is stored in Postgres.

- **Auth:** better-auth with email and password. Each account has its own chats, memory and settings; installed models are shared. One account is signed in at a time, and sessions last a fixed 24 hours (`lib/auth.server.ts`).
- **Tools:** `features/chat/server/tools.server.ts` builds the `ServerTool[]`. The client has one toggle, `web_search`, which turns on `web_search` and `read_url` together. It is sent per request through `forwardedProps` and never saved, and is on by default when `SEARXNG_URL` is set. Memory's tools come from `memoryMiddleware`, since memory is always on.
- **Chat persistence:** `@tanstack/ai-persistence`'s `withPersistence` is server-authoritative. The transcript lives in `ChatThread`, keyed by the conversation id as `threadId`, and the run lifecycle in `ChatRun` and `ChatInterrupt`. The client runs `useChat({ persistence: true })`. `/api/chat/stream` GET loads a thread by `?threadId=` or reconnects to a running stream.

## Codemap

Code is grouped by domain. A feature owns everything about its domain, so a piece has one home that doesn't change when its URL changes or a second page starts using it.

A feature is `src/features/<domain>/`:

- Root files: `<domain>.functions.ts` (server functions), `<domain>.queries.ts` (query factory), `<domain>.schemas.ts` (Zod schemas), `<domain>.types.ts` (shared types).
- Folders: `components/`, `hooks/` (`use-<operation>.ts`), `server/` (`*.server.ts` helpers, no subfolders), `lib/` (pure helpers). A feature leaves out the folders it doesn't need.

Code with no domain lives in `src/components/`, `src/hooks/` and `src/lib/`. Routes live in `src/routes/`.

Each Prisma model belongs to one feature, and a feature can own several:

- `account`: user, account, session, verification
- `chat`: conversation and the chat persistence tables
- `endpoint`: endpoint
- `library`: model setting
- `memory`: memory
- `backup` owns none, and reads and writes across them.

## Layers

Imports flow one way: `components`, `hooks` and `lib`, then `features`, then `routes`. Imports between features never form a cycle.

What code outside a feature may import from it:

- Root files and `hooks/`: anyone.
- `components/`: routes only, never another feature.
- `server/`: server code only, such as another feature's `server/` or a `routes/api/` handler.
- `lib/`: nothing; it is private. A piece two features need moves up to `src/components/` or `src/lib/`.

Routes stay thin: a loader, a head, and a component from a feature. An API route's handlers call a feature's `server/` function. A component that combines several features, or belongs to none, lives in the nearest route's `-components/`, such as the `AppSidebar` shell and the settings Account and Endpoints tabs.

Every setting is edited on a `/settings/*` page. Other pages show the current state and link there; they never embed a settings form.

## Boundaries

File suffixes are build boundaries, enforced by TanStack's import protection:

- `*.server.*` is denied in the client bundle, and `*.client.*` in the server bundle. The suffix needs a word before it: `auth.server.ts`, never `server.ts`.
- Isomorphic modules use a plain hyphenated name: `auth-client.ts`, never `auth.client.ts`.
- `*.functions.ts` stays isomorphic. Client code never imports `*.server.ts`.

`src/generated/` and `src/routeTree.gen.ts` are generated.

## Data

- `createServerFn` lives in `<feature>.functions.ts`: it validates input, resolves the user, and delegates to `server/*.server.ts` for Prisma, crypto and external calls. It is called as `fn({ data })`.
- One query factory per feature, such as `chatQueries`, with keys nested under the feature name. Query keys are written only there.
- Components never import `*.functions.ts`. Mutations go through feature hooks; reads pass the factory to `useQuery` or `useSuspenseQuery`.
- Loaders use the factory: `context.queryClient.query({ ...chatQueries.list(), staleTime: "static" })`. Drop `staleTime` where data must refetch on revisit.
- Mutations invalidate what they touch in `onSuccess`. There is no manual refetching and no local copy of server state.
- One Zod schema per shape, shared by the form validator and the server function input, named in camelCase (`chatSchema`).

Prisma: every model ID is `@id @default(dbgenerated("uuidv7()")) @db.Uuid`, foreign keys are `@db.Uuid`, and camelCase fields carry `@map("snake_case")`.

Server code logs through `log` from `lib/log.server.ts` (pino), with context first: `log.warn({ err, userId }, "message")`.

## Forms

`useAppForm` (TanStack Form) from `src/components/form/`. Each field is a field component, validated with Zod through `validators: { onDynamic: schema }`, and submitted through the kit's `Form`. Server field errors flow through `lib/form-errors.ts`.

A form that waits for the result returns `mutation.mutateAsync(value, { onSuccess })` from `onSubmit`. The hook's `onSuccess` invalidates and toasts, and its `onError` owns the error toast. A per-call `onSuccess` only resets, closes or navigates. Fire-and-forget buttons use `mutate`.

## UI library

`src/components/ui/` holds our own components on Base UI, whose docs in `node_modules/@base-ui/react/docs` are the reference.

- Compose with `render={<El />}`, and prefer a primitive to raw HTML where one exists. Navigation renders the router's `Link` as `render`: `ButtonLink` for a link drawn as a button, `Menu.LinkItem` in a menu. Base UI's Button gives any element `role="button"`, so a link never renders through it.
- Modules copy Base UI's package layout. A multi-part component is `select/index.ts` (`export * as Select from "./select.parts"`) plus `select.parts.tsx`; a single-part one is one file. Import as `import { Select } from "#/components/ui/select"`. A module's own `index.ts` is the only barrel.
- Recipes are `tv()` from `tailwind-variants`, called once at module scope. A caller's `className` goes through `mergeClassName`; `cn()` merges ad-hoc classes outside a recipe.
- In a slot recipe an empty variant value is `{}`, never `""`, since a string drops the slot classes an extending recipe adds. An extending recipe turns off parent defaults it doesn't use (`size: undefined`).
- Axes, from Joy UI: `color` (`primary | neutral | danger`), `variant` (`solid | soft | outlined | quiet`), `size` (`sm | md | lg`), narrowed per component with `ActionVariants<...>`. Shared class sets live in `ui/variants/`.
- State is styled with `data-*` variants. Value attributes such as `data-side` get a `@custom-variant` in `styles/variants.css`. Animation prefers `data-starting-style` and `data-ending-style` transitions to keyframe utilities.
- Components own their styling: an ad-hoc surface is a `<Card>`. `className` is for layout the component can't do itself. Components never set their own width, margins or outer placement; a second element that needs classes gets its own prop, such as `groupClassName`.
- `InputGroup` greys the whole group when any descendant is `disabled`. A control blocked by fixable state uses `aria-disabled`, and a disabled control with a tooltip needs a span `render` trigger.

`components/ui/ui.test.tsx` is one table of library-wide invariants; a new module adds a row.

## Styling and theme

Tailwind v4, with `src/styles/index.css` as the single entry. Colors are authored only in `styles/tokens.css` (`--bg --fg --surface --line --primary --danger --success --warning --radius`) with `light-dark()`, and everything else is derived with `color-mix()`. Mode is `.light` or `.dark` plus `color-scheme`. A preset is `[data-theme="<id>"]` in `styles/themes/`, restating only authored values. The provider is `lib/theme/theme-provider.tsx`.

## Testing

A test sits beside its subject, named for it: `crypto.server.ts` → `crypto.server.test.ts`, and a folder component `ChatInput/index.tsx` → `ChatInput/ChatInput.test.tsx`. A test that needs Postgres drops `.server` for `.db`: `chat.server.ts` → `chat.db.test.ts`.

- `unit`: `*.test.ts` in Node, including database-free `*.server.test.ts`.
- `browser`: `*.test.tsx` in headless Chromium, with `render` and `renderHook` from `#/test/utils` (async). Chromium runs with reduced motion, so Base UI's transitions finish at once, and a setup file loads the real CSS. `render` mounts the real toast viewport.
- `db`: `*.db.test.ts` against Postgres at `TEST_DATABASE_URL`. Each run migrates its own `<name>_<runId>` database and copies it once per worker, so runs can overlap; teardown drops them.

The boundaries a test may fake:

- The model: `fakeText()` from `@tanstack/ai/testing`, through `vi.mock("@tanstack/ai-openai/compatible")`.
- Outbound HTTP: MSW handlers on `network` (`#/test/network.server`) or `worker` (`#/test/msw`).
- A browser test's server: `vi.mock` of the feature's `*.functions.ts`, typed `vi.fn<typeof fn>()`.
- Env and time: `vi.stubEnv` and fake timers.

A test that needs a fixture imports `test` from its fixture module: `#/test/db.server` empties every table first, and the MSW modules fail any request no handler matches. Data comes from the app's own code or a factory (`#/test/factories`, `create*` in `#/test/db.server`). Faker is seeded per test.

## Code style

- Work with the framework. Don't hand-roll what a dependency we keep already does, or run a shim beside it.
- ESLint's `noInlineConfig` is on, so a finding can't be silenced inline.
- The React Compiler is on, so there is no hand-written `useMemo` or `useCallback`.
- Every export has a short JSDoc saying what it is or how to use it, without types. Framework entry points, such as a route file's `Route`, are exempt.
- No dead code, re-exports or `// removed` comments.
