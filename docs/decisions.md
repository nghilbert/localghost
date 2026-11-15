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
