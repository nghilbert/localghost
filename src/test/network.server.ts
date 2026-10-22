import { setupServer } from "msw/node";
import { test as baseTest } from "vitest";

/** Fakes outbound HTTP in node tests. Each test adds handlers with `network.use(...)`. */
export const network = setupServer();

/**
 * `test` with {@link network} intercepting every outbound request. A request no handler
 * matches fails the test, even when the code under test catches the error it gets back.
 * Handlers a test adds are removed after it.
 */
export const test = baseTest
	.extend("network", { scope: "file", auto: true }, ({}, { onCleanup }) => {
		network.listen({ onUnhandledFrame: "error" });
		onCleanup(() => {
			network.close();
		});
		return network;
	})
	.extend("unhandledRequests", { auto: true }, ({ network: running }, { onCleanup }) => {
		const unhandled: string[] = [];
		const record = ({ request }: { request: Request }) => {
			unhandled.push(`${request.method} ${request.url}`);
		};
		running.events.on("request:unhandled", record);
		onCleanup(() => {
			running.events.removeListener("request:unhandled", record);
			running.resetHandlers();
			if (unhandled.length > 0) {
				throw new Error(`No handler for outbound requests: ${unhandled.join(", ")}`);
			}
		});
		return unhandled;
	});

/** `test` under the name `it`, for tests inside a `describe`, as Vitest names them. */
export const it = test;
