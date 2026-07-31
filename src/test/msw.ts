import { setupWorker } from "msw/browser";
import { afterAll, afterEach, beforeAll } from "vitest";

/**
 * The network boundary for browser tests: handlers are registered per-test with
 * `worker.use(...)`, so the app's own `fetch` runs untouched and only the wire
 * response is faked.
 *
 * Started with no default handlers and `bypass`, since Vitest's browser runner
 * makes its own requests that must not be intercepted.
 *
 * No worker script is checked in: Vitest's browser plugin resolves
 * `/mockServiceWorker.js` straight out of the `msw` package, so `msw init` and a
 * copy under `public/` are both unnecessary here.
 */
export const worker = setupWorker();

beforeAll(() => worker.start({ onUnhandledRequest: "bypass", quiet: true }));
afterEach(() => worker.resetHandlers());
afterAll(() => worker.stop());
