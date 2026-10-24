import { setupWorker } from "msw/browser";
import { test as baseTest } from "vitest";

/**
 * Fakes network responses in browser tests. Each test adds handlers with `worker.use(...)`.
 * The `msw/vite` plugin serves the worker script, so none is copied into `public/`.
 */
export const worker = setupWorker();

/** Whether a request is the app's own traffic rather than Vitest loading modules from Vite. */
function isAppRequest(url: URL): boolean {
	return (
		url.origin !== location.origin ||
		url.pathname.startsWith("/api/") ||
		url.pathname.startsWith("/_serverFn")
	);
}

/**
 * `test` with the MSW worker running, so only files that import it pay for starting it.
 * An app request no handler matches fails the test, even when the code under test catches
 * the error. Handlers a test adds are removed after it.
 */
export const test = baseTest
	.extend("worker", { scope: "file", auto: true }, async ({}, { onCleanup }) => {
		// Unmatched requests pass through, since Vitest loads every module over the same origin.
		await worker.start({ onUnhandledFrame: "bypass", quiet: true });
		onCleanup(async () => {
			await worker.stop();
		});
		return worker;
	})
	.extend("unhandledRequests", { auto: true }, ({ worker: running }, { onCleanup }) => {
		const unhandled: string[] = [];
		const record = ({ request }: { request: Request }) => {
			if (isAppRequest(new URL(request.url))) unhandled.push(`${request.method} ${request.url}`);
		};
		running.events.on("request:unhandled", record);
		onCleanup(() => {
			running.events.removeListener("request:unhandled", record);
			running.resetHandlers();
			if (unhandled.length > 0) {
				throw new Error(`No handler for app requests: ${unhandled.join(", ")}`);
			}
		});
		return unhandled;
	});

/** `test` under the name `it`, for tests inside a `describe`, as Vitest names them. */
export const it = test;
