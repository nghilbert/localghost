import { setupWorker } from "msw/browser";
import { afterAll, afterEach, beforeAll } from "vitest";

/**
 * Fakes network responses in browser tests. Importing this starts the worker for that test
 * file only, since starting it costs every file that does not need it. Each test adds
 * handlers with `worker.use(...)`; unhandled requests pass through, since Vitest makes its
 * own. Vitest serves the worker script from the `msw` package, so none is copied into
 * `public/`.
 */
export const worker = setupWorker();

beforeAll(() => worker.start({ onUnhandledRequest: "bypass", quiet: true }));
afterEach(() => worker.resetHandlers());
afterAll(() => worker.stop());
