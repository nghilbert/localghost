import { beforeEach, describe, expect, it } from "vitest";
import { type LlamaModel, LOCAL_LLAMACPP_API_KEY } from "#/lib/llamacpp/client.server";
import { createEndpoint, createUser, resetDb } from "#/test/db.server";
import {
	buildRuntimeCandidateUrls,
	getRuntimeEndpointById,
	toRuntimeModels,
} from "./discovery.server";

beforeEach(resetDb);

describe("getRuntimeEndpointById", () => {
	it("resolves only the requested user-owned llama.cpp endpoint", async () => {
		const user = await createUser();
		const endpoint = await createEndpoint({
			ownerId: user.id,
			url: "http://my-llamacpp:9999/",
			provider: "llamacpp",
			apiKeyEncrypted: null,
		});

		await expect(
			getRuntimeEndpointById({ userId: user.id, endpointId: endpoint.id }),
		).resolves.toEqual({ url: "http://my-llamacpp:9999", apiKey: LOCAL_LLAMACPP_API_KEY });
	});

	it("rejects an endpoint the user does not own", async () => {
		const owner = await createUser();
		const intruder = await createUser();
		const endpoint = await createEndpoint({ ownerId: owner.id, provider: "llamacpp" });

		await expect(
			getRuntimeEndpointById({ userId: intruder.id, endpointId: endpoint.id }),
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

	// A finished download counts as installed, not as still downloading.
	it("treats a just-finished download as installed, not still in flight", () => {
		const models: LlamaModel[] = [
			{
				id: "org/finished-GGUF:Q4_K_M",
				path: "/models/finished.gguf",
				status: { value: "downloaded" },
			},
		];

		expect(toRuntimeModels(models)).toEqual({
			installedModels: [
				{
					id: "org/finished-GGUF:Q4_K_M",
					sizeBytes: null,
					quant: "Q4_K_M",
					paramB: null,
					status: "downloaded",
					vision: false,
				},
			],
			downloads: {},
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
