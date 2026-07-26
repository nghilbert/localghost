import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildRuntimeCandidateUrls,
	getRuntimeEndpoint,
	upsertRuntimeEndpoint,
} from "#/shared/domain/model/discovery.server";

const { findFirst, findMany, upsert, update } = vi.hoisted(() => ({
	findFirst: vi.fn(),
	findMany: vi.fn(),
	upsert: vi.fn(),
	update: vi.fn(),
}));

vi.mock("#/shared/lib/db.server", () => ({
	prisma: { endpoint: { findFirst, findMany, upsert, update } },
}));

describe("getRuntimeEndpoint", () => {
	beforeEach(() => {
		findFirst.mockReset();
		vi.unstubAllEnvs();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("prefers the user's configured llamacpp endpoint", async () => {
		findFirst.mockResolvedValue({ url: "http://my-llamacpp:9999/" });
		await expect(getRuntimeEndpoint("user-1")).resolves.toEqual({
			url: "http://my-llamacpp:9999",
			apiKey: undefined,
		});
	});

	it("falls back to localhost when no endpoint is set", async () => {
		findFirst.mockResolvedValue(null);
		await expect(getRuntimeEndpoint("user-1")).resolves.toEqual({
			url: "http://localhost:8080",
			apiKey: undefined,
		});
	});

	it("queries the oldest llamacpp endpoint for the user", async () => {
		findFirst.mockResolvedValue(null);
		await getRuntimeEndpoint("user-42");
		expect(findFirst).toHaveBeenCalledWith({
			where: { ownerId: "user-42", provider: "llamacpp" },
			orderBy: { id: "asc" },
		});
	});
});

describe("buildRuntimeCandidateUrls", () => {
	it("orders saved urls before well-known addresses", () => {
		expect(buildRuntimeCandidateUrls({ savedUrls: ["http://my-server:8080"] })).toEqual([
			"http://my-server:8080",
			"http://localhost:8080",
			"http://127.0.0.1:8080",
			"http://llamacpp:8080",
			"http://host.docker.internal:8080",
		]);
	});

	it("dedupes after normalizing trailing slashes", () => {
		const candidates = buildRuntimeCandidateUrls({ savedUrls: ["http://localhost:8080///"] });
		expect(candidates).toEqual([
			"http://localhost:8080",
			"http://127.0.0.1:8080",
			"http://llamacpp:8080",
			"http://host.docker.internal:8080",
		]);
	});
});

describe("upsertRuntimeEndpoint", () => {
	beforeEach(() => {
		findFirst.mockReset();
		upsert.mockReset();
		update.mockReset();
	});

	it("upserts on the discovered-row unique on first detection", async () => {
		findFirst.mockResolvedValue(null);
		upsert.mockResolvedValue({ id: "ep-new" });
		await upsertRuntimeEndpoint({ userId: "user-1", url: "http://localhost:8080/" });
		expect(upsert).toHaveBeenCalledWith({
			where: { ownerId_discovered: { ownerId: "user-1", discovered: true } },
			create: {
				name: "llama.cpp (local)",
				url: "http://localhost:8080",
				provider: "llamacpp",
				ownerId: "user-1",
				discovered: true,
			},
			update: { url: "http://localhost:8080" },
			select: { id: true },
		});
		expect(update).not.toHaveBeenCalled();
	});

	it("updates the existing endpoint when llama.cpp moved", async () => {
		findFirst.mockResolvedValue({ id: "ep-1", url: "http://old-host:8080" });
		await upsertRuntimeEndpoint({ userId: "user-1", url: "http://localhost:8080" });
		expect(update).toHaveBeenCalledWith({
			where: { id: "ep-1" },
			data: { url: "http://localhost:8080" },
		});
		expect(upsert).not.toHaveBeenCalled();
	});

	it("does nothing when the saved url already matches", async () => {
		findFirst.mockResolvedValue({ id: "ep-1", url: "http://localhost:8080" });
		await upsertRuntimeEndpoint({ userId: "user-1", url: "http://localhost:8080/" });
		expect(upsert).not.toHaveBeenCalled();
		expect(update).not.toHaveBeenCalled();
	});
});
