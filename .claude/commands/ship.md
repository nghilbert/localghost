---
description: Run the 4-gate check, then commit, push, PR, and merge the current branch
---

Ship the current branch following this project's SDLC. $ARGUMENTS may describe the change for the commit/PR title.

1. If on `main`, stop — ask for a branch name or create one (`feat/`, `fix/`, `refactor/`, `chore/`) and move the changes onto it.
2. Run all four gates in order, fixing any failures before continuing (re-run after fixes):
   - `npm run fix`
   - `npm run check`
   - `npm test run`
   - `npm run build`
3. Commit with a short imperative message (≤70 chars), ending with the Claude co-author trailer.
4. Push the branch, open the PR with `gh pr create` (summary + test plan), then `gh pr merge --merge --delete-branch`.
5. `git checkout main && git pull --ff-only`, and confirm the merge commit landed.
