# TODO

Numbers are stable IDs (from the original list), not priority. Items are shown in
recommended order: #6 defines how models are sourced, which #4/#5 and #7 build on.
#1 and #8 are cleanup that can slot in between. #3 is an umbrella the others chip
away at.

## Provider / model source

- [ ] **#6 — Simplify the "provider" concept to: local Ollama built-in + cloud
  add-ons.** Adding a second provider broke things (controls looked disabled but
  still routed a request), and the word "provider" doesn't say what it is.
  - Local Ollama is a built-in source that always exists. Users never "add" it.
  - "Adding a provider" means only a bring-your-own **cloud endpoint** (URL +
    key). Rename the concept in the UI to something concrete (e.g. Cloud
    endpoint / Connection).
  - Root-cause and fix the disabled-but-still-active bug (selection/enabled
    state got out of sync with a second endpoint).
  - Strip the endpoints UI and logic down to the minimum for this model.
  - _Depends on nothing; everything else about models leans on this._

## Library

- [ ] **#4 — Build a browsable model catalog from the Ollama library.** The Browse
  tab should list installable local models pulled from ollama.com/library (name,
  parameter sizes, tags, blurb).
  - Needs pagination and a periodic refresh (the library is large).
  - Install flows through the existing pull route
    (`src/routes/api/library/pull.tsx`).
  - _Open: scrape the library vs. a curated/cached snapshot. Decide during
    design._

- [ ] **#5 — One shared table for My Models and Browse.** Both tabs should render
  the same table so every field about a model is visible in either place. Build it
  on the single `DataTable` (`src/components/DataTable/`), with columns that cover
  installed-state plus catalog metadata.
  - _Depends on #4 for the Browse data shape._

## Chat

- [ ] **#7 — Lock a conversation to a model, fixed at creation.** The model is
  chosen when the chat is created and cannot change within that conversation.
  - Remove the in-conversation model picker; show the locked model read-only.
  - Reconcile with the new create-on-open flow: the model must be picked at
    creation (either a chooser on "New chat", or the empty-state picker that sets
    the model and locks once the row exists / first message sends). Decide the
    exact moment during design.
  - Changing model = start a new chat.

## Cleanup

- [ ] **#1 — Solidify the db → server → functions → hooks → ui layering.** The
  pattern is good but only loosely followed. Make every feature follow it
  consistently: Prisma models → `*.server.ts` (server-only logic) →
  `*.functions.ts` (server fns + query options) → `use-*` hooks → components.
  Audit each feature and refactor the stragglers so the boundaries are the same
  everywhere.

- [ ] **#8 — Audit what we persist; stop storing what doesn't need durable state.** 
  Persisting too much feels like bad practice. I'll review the schema and
  the persistence layer and propose removals/moves-to-cache before touching
  anything.
  - Candidates to look at: model lists, model capabilities, hardware info
    (all refetchable, could be query cache instead of DB rows).
  - Confirm what's already ephemeral (per-message tool toggles are not
    persisted) and flag anything that surprises.

## UX (umbrella)

- [ ] **#3 — Make the experience seamless: intuitive, not complex.** Umbrella
  goal. The items above each move this forward (new-chat fix, provider
  simplification, model lock). As specific friction surfaces, capture it here as
  concrete sub-items rather than one vague line.

## Done

- [x] **#2 — Fix the new-chat flow.** First message on a new chat blanked the
  screen. Cause was an out-of-band handoff (module-level `Map` + no-deps
  `useEffect` + a cross-route remount), not the naming logic. Collapsed to one
  chat surface: `/new` is now a resolver that reuses-or-creates a draft and
  redirects; the first message sends through the same composer path as every later
  message.
