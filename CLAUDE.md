# localghost

A local-first AI chat app: install models (local through llama.cpp, or a cloud endpoint) and chat with them. TanStack Start, React 19 with the React Compiler, Base UI, Tailwind v4, Prisma 7 on Postgres, better-auth and TanStack AI.

## Commands

```bash
pnpm test run src/features/chat     # tests under a path; projects: unit, browser, db
pnpm test related src/lib/format.ts --run   # tests that import a file
pnpm typecheck
pnpm lint src/features/chat
pnpm format
pnpm build
```

The dev loop is `docker compose up --build`; see README.md. The `db` tests need Postgres at `TEST_DATABASE_URL`.

`typescript` is TypeScript 6 only because typescript-eslint needs its JS API; everything else runs TypeScript 7 from `@typescript/native`.

## Generated code

- `src/generated/` and `src/routeTree.gen.ts` are generated; change their sources.
- Edit the schema in `prisma/schema/`. I run `pnpm prisma migrate dev` and `pnpm prisma generate`.

## Where things are

- [docs/architecture.md](docs/architecture.md): layout, data flow, UI, styling and testing conventions.
- [docs/decisions.md](docs/decisions.md): why each design choice was made.

## Docs

Prefer a project's `llms.txt`. Base UI's docs are installed in `node_modules/@base-ui/react/docs`.

- [TanStack Start](https://tanstack.com/start/latest), [AI](https://tanstack.com/ai/latest), [Query](https://tanstack.com/query/latest), [Form](https://tanstack.com/form/latest)
- [Prisma 7](https://www.prisma.io/docs), [better-auth](https://www.better-auth.com/llms.txt), [Tailwind v4](https://tailwindcss.com/docs), [tailwind-variants](https://www.tailwind-variants.org/docs)
- [Vitest](https://vitest.dev/llms.txt), [MSW](https://mswjs.io/docs)
- [llama.cpp server](https://github.com/ggml-org/llama.cpp/tree/master/tools/server), [SearXNG](https://docs.searxng.org/)
