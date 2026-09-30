import { describe, expect, it } from "vitest";
import { libraryStatusPollInterval } from "#/features/library/library.queries";
import type { RuntimeStatus } from "#/features/library/library.types";

const found: RuntimeStatus = {
	found: true,
	runtimeUrl: "http://localhost:8080",
	installedModels: [],
	downloads: {},
	endpointId: "endpoint-1",
};

const notFound: RuntimeStatus = {
	found: false,
	runtimeUrl: null,
	installedModels: [],
	downloads: {},
	endpointId: null,
};

describe("libraryStatusPollInterval", () => {
	it("scans quickly until a runtime is found, then backs off", () => {
		expect(libraryStatusPollInterval(undefined)).toBe(5_000);
		expect(libraryStatusPollInterval(notFound)).toBe(5_000);
		expect(libraryStatusPollInterval(found)).toBe(30_000);
	});

	// The only path carrying byte counts is /models/sse; polling covers a dead stream.
	it("polls fast while a download is in flight", () => {
		expect(
			libraryStatusPollInterval({
				...found,
				downloads: { "org/model:Q4_K_M": { status: "Downloading" } },
			}),
		).toBe(2_000);
	});
});
