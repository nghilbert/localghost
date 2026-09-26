# CLAUDE.md

A local-first AI chat app: install models (local via llama.cpp, or a bring-your-own cloud endpoint) and chat with them. The **Library** (browse and install models) is the core surface; web search and long-term **Memory** are tools inside chat.

## Commands

```bash
npm run dev          # dev server on :3000
npm run build        # typecheck + production build
npm run biome check  # lint + format check
npm run biome:fix    # auto-fix
npm run test -- run  # all Vitest projects once
npm run test -- run --project unit   # or: browser, server
```

`biome` and `prisma` are passthrough scripts. Put `--` before flags: `npm run biome -- check --write` keeps `--write`; `npm run biome check --write` drops it.

The dev loop is Docker Compose: `docker compose up --build`. `.env` selects the environment through `COMPOSE_PROFILES` (`dev` = Vite HMR, `prod` = built image, `llamacpp` = bundled llama-server) and `COMPOSE_FILE` (GPU overlays). Native fallback: `docker compose up db -d`, then `npm run dev`. See `.env.example` and `README.md`.

## Workflow

- **Never** run `git add`, `git commit`, `git push`, `git stash`, `git mv`, or create branches without explicit permission from the user. Otherwise leave changes in the working tree.
- **Never** run `prisma generate`, `migrate`, `db push`, or `migrate reset`. Edit `prisma/schema/` only, then tell the user the exact command, e.g. `npm run prisma -- migrate dev --name <name>`.
- Never edit generated output: `src/generated/`, `src/routeTree.gen.ts`.
- Before finishing: `npm run biome check` and `npm run build`; run the tests you touched.
- When permitted to commit, split the work into logical chunks. Each message is one concise imperative line. **Never** add co-author, signature, or generated-with lines.
- Without commit permission, end with one section per logical change: a fenced `git add <paths>`, then that one-line message.
- Delegate mechanical or narrow tasks to a smaller model (`haiku`); keep design work on the default model.

## Rules

- **Work with the framework.** Never hand-roll what a retained dependency does, and no shim running beside a library we keep.
- **No `as` casts** (`as const` is fine) and no non-null `!`. Type via generics, annotations, narrowing, or Prisma model types.
- **No `biome-ignore`** and no Biome overrides. Fix the real issue.
- **No dead code**, no re-exports, no `// removed` comments. No barrels except a ui module's own `index.ts`.
- **Server-only:** never import `*.server.ts` from client code.
- **Prisma:** every model ID is `@id @default(dbgenerated("uuidv7()")) @db.Uuid` (better-auth's `generateId: "uuid"` relies on it); FKs are `@db.Uuid`; camelCase fields `@map("snake_case")`.
- **Comments** explain non-obvious code only: a reason, a constraint, or a library quirk being worked around. Delete any comment that restates the code. Keep them short.
- **JSDoc** on every export, concise (one line where possible), saying what it is or how to use it so the IDE shows it. No types in JSDoc; TypeScript does the typing. Framework entry points (a route file's `Route`, `getRouter`) are exempt.
- Comments describe the code as it is now. No history or before/after notes, no fix, issue, or PR references, no bug or attack stories (state the invariant instead: "endpointId comes from the client, so ownership is checked here"), no defending rejected alternatives, no counts that go stale. Rationale goes in the commit message.
- **Test complex work** (parsers, transforms, non-trivial UI) with Vitest, asserting real behavior with tiny inline inputs.

## Folder layout

Code is grouped by domain. Each feature owns everything about its domain, so a piece has one home that does not change when its URL changes or a second page starts using it.

A feature is `features/<domain>/`:

- Root files: `<domain>.functions.ts` (server functions), `<domain>.queries.ts` (query factory), `<domain>.schemas.ts` (Zod schemas), `<domain>.types.ts` (shared types).
- Folders: `components/`, `hooks/` (`use-<operation>.ts`), `server/` (`*.server.ts` helpers), `lib/` (pure helpers).

Code with no domain lives in `src/components/`, `src/hooks/` and `src/lib/`.

- Imports flow one way: `components`, `hooks` and `lib`, then `features`, then `routes`.
- Every feature has the same folders; leave out the ones it does not need. `server/` holds only `*.server.ts` files, with no subfolders; pure helpers go in `lib/` and schemas in `<domain>.schemas.ts`.
- What code outside a feature may import from it:
  - root files and `hooks/`: anyone.
  - `components/`: routes only, never another feature.
  - `server/`: server code only (another feature's `server/`, a `routes/api/` handler). The `.server.ts` suffix keeps it out of the client.
  - `lib/`: nothing; it is private. A piece two features need moves up to `src/components/` or `src/lib/`.
- Imports between features never form a cycle.
- Each Prisma model belongs to one feature, and a feature can own several: `account` owns user, account, session, verification; `chat` owns conversation and the chat persistence tables; `endpoint` owns endpoint; `library` owns model setting; `memory` owns memory. `backup` owns none and reads and writes across them.
- Routes stay thin: a loader, a head, and a component from a feature. An API route's handlers call a feature's `server/` function. A component that combines several features or belongs to none (the `AppSidebar` shell, the settings Account and Endpoints tabs) lives in the nearest route's `-components/`.
- Every setting is edited on a `/settings/*` page. Other pages show the current state and link to that page; they never embed a settings form.
- **Suffixes are build boundaries** (TanStack import protection): `*.server.*` is denied in the client bundle, `*.client.*` in the server bundle. The suffix needs a word before it (`auth.server.ts`, never `server.ts`). Isomorphic modules use a plain hyphenated name (`auth-client.ts`, never `auth.client.ts`). `*.functions.ts` must stay isomorphic.

## Data

- `createServerFn` lives in `<feature>.functions.ts`: validate input, resolve the user, delegate to `server/*.server.ts` (prisma, crypto, external calls). Called as `fn({ data })`.
- One query factory per feature (`chatQueries`) in `<feature>.queries.ts`, keys hierarchical under the feature name. Never write a literal query key elsewhere.
- **Mutations go through feature hooks**: components never import `*.functions.ts`. Reads pass the factory straight to `useQuery` / `useSuspenseQuery`.
- Loaders use the factory: `context.queryClient.query({ ...chatQueries.list(), staleTime: "static" })`; drop `staleTime` where data must refetch on revisit.
- Mutations invalidate what they touch in `onSuccess`; no manual refetching or local copies of server state.
- One Zod schema per shape, shared by the form validator and the server fn input. Name schemas camelCase (`chatSchema`); import from `zod`.

## UI library (`src/components/ui/`)

- Our own abstractions on Base UI; Base UI's docs (`node_modules/@base-ui/react/docs`) are the reference. Compose with `render={<El />}`; no raw HTML where a primitive exists. Navigation renders a link with the router's Link as `render`: `ButtonLink` for a link drawn as a button, `Menu.LinkItem` in a menu. Base UI's Button gives any element `role="button"`, so never render a link through it.
- Modules copy Base UI's package layout: multi-part `select/index.ts` (`export * as Select from "./select.parts"`) + `select.parts.tsx`; single-part is one file. Import `import { Select } from "#/components/ui/select"`, never `import * as`.
- Recipes are `tv()` from `tailwind-variants`, called once at module scope. A caller's `className` goes through `mergeClassName`. Use `cn()` from `tailwind-variants` for ad-hoc merging outside a recipe.
- In a slot recipe an empty variant value is `{}`, never `""`: a string there drops the slot classes a recipe that extends it adds for the same key. When extending a recipe, turn off any parent default the child does not use (`size: undefined`).
- Axes (from Joy UI): `color` (`primary | neutral | danger`), `variant` (`solid | soft | outlined | quiet`), `size` (`sm | md | lg`). Narrow per component with `ActionVariants<...>`.
- Shared class sets live in `ui/variants/`; everything else is a private const in its module.
- Style state with `data-*` variants; value attributes (`data-side`, `data-orientation`) get a `@custom-variant` in `styles/base.css`. Animate with `data-starting-style` / `data-ending-style` transitions, not keyframe utilities.
- **Components own their styling**: an ad-hoc surface is a `<Card>`, not a styled `<div>`. `className` is for layout the component cannot do itself.
- **Layout-agnostic components** never set their own width, margins, or outer placement; the parent owns the space. A second element that needs its own classes gets a distinctly named prop (`groupClassName`).
- Gotcha: `InputGroup` greys the whole group when any descendant is `disabled`. For a control blocked by fixable state use `aria-disabled`; a disabled control that needs a tooltip needs a span `render` trigger.

## Styling and theme

- Tailwind v4, `src/styles/globals.css` is the single entry. Colors are authored only in `styles/tokens.css` (`--bg --fg --surface --line --primary --danger --success --warning --radius`) with `light-dark()`; everything else is derived with `color-mix()`. Never hardcode a color.
- Mode is `.light` / `.dark` plus `color-scheme`; a preset is `[data-theme="<id>"]` in `styles/themes/`, restating only authored values. The provider is `lib/theme/theme-provider.tsx`.

## React

- React Compiler is on: no hand-written `useMemo` / `useCallback`.

## Forms

`useAppForm` (TanStack Form) from `src/components/form/`. Never hand-wire `useState` per field; add a field component. Validate with Zod via `validators: { onDynamic: schema }`. Submit through the kit's `Form`; server field errors flow through `lib/form-errors.ts`.

Completion-dependent forms return `mutation.mutateAsync(value, { onSuccess })` from `onSubmit`, with no extra `async`/`try`. The hook-level `onSuccess` invalidates and toasts; hook-level `onError` owns the error toast; per-call `onSuccess` is only for local reset, close, or navigation. Fire-and-forget buttons use `mutate`.

## Testing

Tests sit beside their subject, named for it (`chat.server.ts` -> `chat.server.test.ts`; a folder component `ChatInput/index.tsx` -> `ChatInput/ChatInput.test.tsx`). Three projects:

- `unit`: `*.test.ts` in node. Extract pure logic and test it plain.
- `browser`: `*.test.tsx` in headless Chromium. `render` / `renderHook` from `#/test/utils` (async); interact with `userEvent` from `vitest/browser` (never `fireEvent` or `@testing-library/user-event`); assert with `await expect.element(...)` / `expect.poll`. Setup files disable Base UI's transition wait and load the real CSS.
- `server`: `*.server.test.ts` against a real Postgres at `TEST_DATABASE_URL` (the Compose `db` service is started if unreachable, then reset before the run and copied to one `<name>_<n>` database per worker, so files run in parallel).

Rules: query by role, label, or text (`getByTestId` is a last resort; `components/ui/` emits no test ids); never assert class names; no casts or non-null `!` in tests; guard `getAll...()[n]`. `components/ui/ui.test.tsx` is one table of library-wide invariants; a new module adds a row.

## Architecture

- **Framework:** TanStack Start (Vite, nitro), file-based routing, alias `#/` = `src/`. Auth is better-auth (email/password, single account), session resolved in the root `beforeLoad`; `_authenticated.tsx` guards and renders the `AppSidebar` shell.
- **Tools:** `features/chat/server/tools.server.ts` builds the `ServerTool[]`. The client exposes one toggle, `web_search`, which enables `web_search` and `read_url` together (sent per request via `forwardedProps`, never saved; on by default when `SEARXNG_URL` is set). Memory's tools come from `memoryMiddleware`, since memory is always on.
- **Chat persistence:** `@tanstack/ai-persistence`'s `withPersistence` is server-authoritative. The transcript lives in `ChatThread` (keyed by the conversation id as `threadId`), run lifecycle in `ChatRun` / `ChatInterrupt`. The client runs `useChat({ persistence: true })`; `/api/chat/stream` GET loads a thread by `?threadId=` or reconnects to a running stream.
- **Backup:** `routes/api/backup/` export and non-destructive import.
