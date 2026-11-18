# Decisions

Why localghost is built the way it is. Each entry gives the question, the choice, why, and where the idea comes from. It records choices; it isn't proof that one is still the best. "Source: not recorded" marks an older choice whose source wasn't written down.

## Tooling

**1. Which TypeScript runs where?**

- Choice: `tsc`, the build and the editor run TypeScript 7 from `@typescript/native`. The `typescript` package is TypeScript 6 (`@typescript/typescript6`).
- Why: typescript-eslint needs TypeScript's JS API, which it reads from the `typescript` package.
- Source: not recorded.

**2. How are checks run?**

- Choice: through the package.json scripts and `pnpm exec`, as listed in CLAUDE.md.
- Why: an earlier note said a pnpm command run by Claude relinked `node_modules`. On 2026-11-14, `pnpm exec tsc --version` left `node_modules`, `.bin` and `.modules.yaml` unchanged, so the note wasn't supported. The `test` script also loads `.env` through dotenvx, which the `db` project needs.
- Source: Claude Code best practices, "Keep CLAUDE.md short" (its example uses the pnpm form); the check above.

**3. Where do agent skills live?**

- Choice: at user scope, installed with the skills CLI's `-g` flag through `pnpm dlx`. Nothing about skills is committed or ignored in this repo.
- Why: skills are personal tooling, not part of the app.
- Source: Claude Code skills docs, skill scopes ("Personal").

## Data

**4. What is a model's ID?**

- Choice: `@id @default(dbgenerated("uuidv7()")) @db.Uuid`, with `@db.Uuid` foreign keys.
- Why: better-auth's `generateId: "uuid"` leaves ID generation to the database.
- Source: not recorded.

**5. Who owns the chat transcript?**

- Choice: the server, through `@tanstack/ai-persistence`'s `withPersistence`. The client runs `useChat({ persistence: true })`.
- Why: a stream can be reconnected to, and the transcript survives a closed tab.
- Source: not recorded.

## Code layout

**6. How is code grouped?**

- Choice: by domain, in `src/features/<domain>/`, with the folder rules in architecture.md.
- Why: a piece has one home that doesn't change when its URL changes or a second page starts using it.
- Source: not recorded.

## Bundled llama.cpp

**7. How does a model's context fit in memory?**

- Choice: `LLAMA_ARG_CTX_SIZE` is unset by default, so `--fit` shrinks the model's context to fit, down to `--fit-ctx` (4096). `LLAMA_ARG_FIT_TARGET` is 6144 MiB without a GPU and llama.cpp's default 1024 on the GPU overlays.
- Why: any `-c` value, 0 included, stops `--fit` from shrinking the context, and Qwen3.5-4B then loaded its full 262144 and swapped a 15 GiB laptop. With a GPU, `--fit` checks only the GPU's budget. Without one, it counts all RAM as free. So the CPU-only target leaves room for the rest of the host, while an integrated GPU's budget is already a share of RAM (8186 of 15349 MiB on RADV). Fitting to available RAM waits on llama.cpp #22939 and #22922.
- Source: llama.cpp b12375 `common/arg.cpp:1609-1619` and `common/fit.cpp:396-458`; `llama-server --list-devices`; a load on 2026-11-17.

## CI

**8. What runs in CI?**

- Choice: `.github/workflows/check.yaml` runs `pnpm typecheck`, `pnpm lint`, `pnpm exec prettier --check .` and `pnpm test run`, with all three test projects, on pull requests and pushes to main. The job runs in Playwright's `mcr.microsoft.com/playwright` image, tagged to the installed `playwright`, and reaches the `pgvector/pgvector:pg18` service container as `db`. `pnpm build` and the Docker image aren't checked yet.
- Why: before this, checks ran only locally, and the full suite is too heavy to run beside other work. Leaving out the build and the image keeps the first workflow small. `playwright install --with-deps` took 28 to 325 s, mostly in `apt-get`, while the image already has Chromium and its system libraries.
- Source: issue #189; GitHub Docs, [Creating PostgreSQL service containers](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers): a job in a container reaches a service by its label, with no port mapping; Playwright, [Continuous Integration](https://playwright.dev/docs/ci): caching browsers isn't recommended, and the OS dependencies aren't cacheable.

## Issues

**9. How are issues classified?**

- Choice: GitHub issue types (Bug, Feature, Task) give the kind of work, and the issue forms in `.github/ISSUE_TEMPLATE/` set them. Labels give a priority (P1–P3) and one `area/` category: `area/chat`, `area/library`, `area/llamacpp`, `area/tooling` or `area/architecture`. Form fields match the issue bodies: What, then Impact or Proposal, then Done when.
- Why: issue types are GitHub's own field for the kind of work, so type labels would duplicate them. GitHub gives no standard for categories, and the `area/` prefix is the most widely documented one. GitHub also gives no standard form fields, so the forms keep the format the issues already used.
- Source: GitHub Docs, [Managing issue types in an organization](https://docs.github.com/en/issues/tracking-your-work-with-issues/configuring-issues/managing-issue-types-in-an-organization): every user account and organization has task, bug and feature types (the repository's GraphQL `issueTypes` lists them); [Syntax for issue forms](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms): the `type` key sets the issue type; Kubernetes, [labels.md](https://github.com/kubernetes/test-infra/blob/master/label_sync/labels.md): `area/` labels name the part of a project affected.
