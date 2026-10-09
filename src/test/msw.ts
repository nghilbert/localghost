import { setupWorker } from "msw/browser";
import { test as baseTest } from "vitest";

/**
 * Fakes network responses in browser tests. Each test adds handlers with `worker.use(...)`;
 * unhandled requests pass through, since Vitest makes its own. Vitest serves the worker script
 * from the `msw` package, so none is copied into `public/`.
 */
export const worker = setupWorker();

/**
 * `test` with the MSW worker running, so only files that import it pay for starting it.
 * Handlers a test adds are removed after it.
 */
export const test = baseTest
	.extend("worker", { scope: "file", auto: true }, async ({}) => {
		await worker.start({ onUnhandledRequest: "bypass", quiet: true });
		return worker;
	})
	.extend("resetHandlers", { auto: true }, ({ worker: running }, { onCleanup }) => {
		onCleanup(() => {
			running.resetHandlers();
		});
	});
