import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildRuntimeCandidateUrls,
	getRuntimeEndpoint,
	getRuntimeEndpointById,
	toRuntimeModels,
	upsertRuntimeEndpoint,
} from "#/shared/domain/model/discovery.server";
import type { LlamaModel } from "#/shared/lib/llamacpp/client.server";

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

describe("getRuntimeEndpointById", () => {
	it("resolves only the requested user-owned llama.cpp endpoint", async () => {
		findFirst.mockResolvedValue({ url: "http://my-llamacpp:9999/", apiKeyEncrypted: null });
		await expect(
			getRuntimeEndpointById({ userId: "user-42", endpointId: "endpoint-7" }),
		).resolves.toEqual({ url: "http://my-llamacpp:9999", apiKey: undefined });
		expect(findFirst).toHaveBeenCalledWith({
			where: { id: "endpoint-7", ownerId: "user-42", provider: "llamacpp" },
		});
	});

	it("rejects an endpoint the user does not own", async () => {
		findFirst.mockResolvedValue(null);
		await expect(
			getRuntimeEndpointById({ userId: "user-42", endpointId: "endpoint-7" }),
		).rejects.toThrow("llama.cpp endpoint not found");
	});
});

describe("toRuntimeModels", () => {
	it("keeps sleeping models installed and aggregates all download files", () => {
		const models: LlamaModel[] = [
			{ id: "org/loaded-GGUF:Q4_K_M", path: "/models/loaded.gguf", status: { value: "loaded" } },
			{
				id: "org/loading-GGUF:Q4_K_M",
				path: "/models/loading.gguf",
				status: { value: "loading" },
			},
			{
				id: "org/unloaded-GGUF:Q4_K_M",
				path: "/models/unloaded.gguf",
				status: { value: "unloaded" },
			},
			{
				id: "org/model-GGUF:Q4_K_M",
				path: "/models/model.gguf",
				status: { value: "sleeping" },
			},
			{
				id: "org/download-GGUF:Q4_K_M",
				path: "/models/download.gguf",
				status: {
					value: "downloading",
					progress: {
						first: { done: 4, total: 10 },
						second: { done: 12, total: 20 },
					},
				},
			},
		];

		expect(toRuntimeModels(models)).toEqual({
			installedModels: [
				{
					id: "org/loaded-GGUF:Q4_K_M",
					sizeBytes: null,
					quant: "Q4_K_M",
					paramB: null,
					status: "loaded",
					vision: false,
				},
				{
					id: "org/loading-GGUF:Q4_K_M",
					sizeBytes: null,
					quant: "Q4_K_M",
					paramB: null,
					status: "loading",
					vision: false,
				},
				{
					id: "org/unloaded-GGUF:Q4_K_M",
					sizeBytes: null,
					quant: "Q4_K_M",
					paramB: null,
					status: "unloaded",
					vision: false,
				},
				{
					id: "org/model-GGUF:Q4_K_M",
					sizeBytes: null,
					quant: "Q4_K_M",
					paramB: null,
					status: "sleeping",
					vision: false,
				},
			],
			downloads: {
				"org/download-GGUF:Q4_K_M": { status: "Downloading", completed: 16, total: 30 },
			},
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
			update: { url: "http://localhost:8080", provider: "llamacpp" },
			select: { id: true },
		});
		expect(update).not.toHaveBeenCalled();
	});

	it("updates the existing endpoint when llama.cpp moved", async () => {
		findFirst.mockResolvedValue({ id: "ep-1", url: "http://old-host:8080" });
		await upsertRuntimeEndpoint({ userId: "user-1", url: "http://localhost:8080" });
		expect(update).toHaveBeenCalledWith({
			where: { id: "ep-1" },
			data: { url: "http://localhost:8080", provider: "llamacpp" },
		});
		expect(upsert).not.toHaveBeenCalled();
	});

	it("corrects a pre-migration discovered row still tagged provider ollama", async () => {
		// The lookup that supplies `existing` (or `resolved` here) always filters
		// on provider: "llamacpp", so a legacy row never surfaces there and this
		// always takes the upsert path — which is why the upsert's `update` must
		// carry `provider` too, not just `create`.
		findFirst.mockResolvedValue(null);
		upsert.mockResolvedValue({ id: "ep-legacy" });
		await upsertRuntimeEndpoint({ userId: "user-1", url: "http://localhost:8080" });
		expect(upsert).toHaveBeenCalledWith(
			expect.objectContaining({ update: { url: "http://localhost:8080", provider: "llamacpp" } }),
		);
	});

	it("does nothing when the saved url already matches", async () => {
		findFirst.mockResolvedValue({ id: "ep-1", url: "http://localhost:8080" });
		await upsertRuntimeEndpoint({ userId: "user-1", url: "http://localhost:8080/" });
		expect(upsert).not.toHaveBeenCalled();
		expect(update).not.toHaveBeenCalled();
	});
});
