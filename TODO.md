# TODO

Numbers are stable IDs (from the original list), not priority. Items are shown in
recommended order: #6 defines how models are sourced, which #4/#5 and #7 build on.
#1 and #8 are cleanup that can slot in between. #3 is an umbrella the others chip
away at.

## Cleanup

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
