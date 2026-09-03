import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "#/prisma/db";
import {
	buildRuntimeCandidateUrls,
	getRuntimeEndpoint,
	getRuntimeEndpointById,
	toRuntimeModels,
	upsertRuntimeEndpoint,
} from "#/shared/domain/model/discovery.server";
import { type LlamaModel, LOCAL_LLAMACPP_API_KEY } from "#/shared/lib/llamacpp/client.server";
import { nowTimestamp } from "#/shared/lib/temporal";

const { decryptMock } = vi.hoisted(() => ({ decryptMock: vi.fn() }));
vi.mock("#/shared/lib/crypto.server", () => ({ decrypt: decryptMock, encrypt: vi.fn() }));

let userId: string;

beforeEach(async () => {
	decryptMock.mockReset();
	const user = await db.orm.public.User.create({
		name: "Test",
		email: `test-${crypto.randomUUID()}@example.com`,
		updatedAt: nowTimestamp(),
	});
	userId = user.id;
});

afterEach(async () => {
	await db.orm.public.User.where({ id: userId }).delete();
});

async function makeEndpoint(overrides: {
	url: string;
	apiKeyEncrypted?: string | null;
	discovered?: boolean;
	provider?: string;
}) {
	return db.orm.public.Endpoint.create({
		name: "llamacpp",
		provider: overrides.provider ?? "llamacpp",
		url: overrides.url,
		apiKeyEncrypted: overrides.apiKeyEncrypted ?? null,
		ownerId: userId,
		discovered: overrides.discovered ?? null,
		updatedAt: nowTimestamp(),
	});
}

describe("getRuntimeEndpoint", () => {
	it("prefers the user's configured llamacpp endpoint", async () => {
		await makeEndpoint({ url: "http://my-llamacpp:9999/" });
		await expect(getRuntimeEndpoint(userId)).resolves.toEqual({
			url: "http://my-llamacpp:9999",
			apiKey: LOCAL_LLAMACPP_API_KEY,
		});
	});

	it("falls back to localhost when no endpoint is set", async () => {
		await expect(getRuntimeEndpoint(userId)).resolves.toEqual({
			url: "http://localhost:8080",
			apiKey: LOCAL_LLAMACPP_API_KEY,
		});
	});

	// /models/sse and /models/unload reject unauthenticated requests, so a discovered
	// endpoint (which stores no key) still has to send the bundled service's.
	it("sends the bundled key when the endpoint stores none, the stored key otherwise", async () => {
		await makeEndpoint({ url: "http://my-llamacpp:9999", apiKeyEncrypted: null });
		await expect(getRuntimeEndpoint(userId)).resolves.toMatchObject({
			apiKey: LOCAL_LLAMACPP_API_KEY,
		});

		await db.orm.public.Endpoint.where({ ownerId: userId }).delete();
		decryptMock.mockReturnValue("user-supplied-key");
		await makeEndpoint({ url: "http://my-llamacpp:9999", apiKeyEncrypted: "ciphertext" });
		await expect(getRuntimeEndpoint(userId)).resolves.toMatchObject({
			apiKey: "user-supplied-key",
		});
	});
});

describe("getRuntimeEndpointById", () => {
	it("resolves only the requested user-owned llama.cpp endpoint", async () => {
		const endpoint = await makeEndpoint({ url: "http://my-llamacpp:9999/" });
		await expect(getRuntimeEndpointById({ userId, endpointId: endpoint.id })).resolves.toEqual({
			url: "http://my-llamacpp:9999",
			apiKey: LOCAL_LLAMACPP_API_KEY,
		});
	});

	it("rejects an endpoint the user does not own", async () => {
		await expect(
			getRuntimeEndpointById({ userId, endpointId: crypto.randomUUID() }),
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
	it("creates the discovered row on first detection", async () => {
		const id = await upsertRuntimeEndpoint({ userId, url: "http://localhost:8080/" });
		const row = await db.orm.public.Endpoint.first({ id });
		expect(row).toMatchObject({
			name: "llama.cpp (local)",
			url: "http://localhost:8080",
			provider: "llamacpp",
			ownerId: userId,
			discovered: true,
		});
	});

	it("updates the existing endpoint when llama.cpp moved", async () => {
		const existing = await makeEndpoint({ url: "http://old-host:8080" });
		const id = await upsertRuntimeEndpoint({
			userId,
			url: "http://localhost:8080",
			existing: { id: existing.id, url: existing.url },
		});
		expect(id).toBe(existing.id);
		const row = await db.orm.public.Endpoint.first({ id });
		expect(row?.url).toBe("http://localhost:8080");
	});

	it("does nothing when the saved url already matches", async () => {
		const existing = await makeEndpoint({ url: "http://localhost:8080" });
		const id = await upsertRuntimeEndpoint({
			userId,
			url: "http://localhost:8080/",
			existing: { id: existing.id, url: existing.url },
		});
		expect(id).toBe(existing.id);
	});

	it("a concurrent first-detection race resolves to one row, not a duplicate-key error", async () => {
		const [id1, id2] = await Promise.all([
			upsertRuntimeEndpoint({ userId, url: "http://localhost:8080" }),
			upsertRuntimeEndpoint({ userId, url: "http://localhost:8080" }),
		]);
		expect(id1).toBe(id2);
		const { total } = await db.orm.public.Endpoint.where({
			ownerId: userId,
			discovered: true,
		}).aggregate((a) => ({ total: a.count() }));
		expect(total).toBe(1);
	});
});
