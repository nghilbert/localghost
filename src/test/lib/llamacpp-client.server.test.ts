import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	deleteModel,
	downloadModel,
	listModels,
	openModelEventStream,
	unloadModel,
} from "#/shared/lib/llamacpp/client.server";

const fetchMock = vi.fn();

beforeEach(() => {
	fetchMock.mockReset();
	vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("llama.cpp model status", () => {
	it("parses installed, sleeping, and multi-file downloading states", async () => {
		fetchMock.mockResolvedValue(
			new Response(
				JSON.stringify({
					data: [
						{ id: "org/ready:Q4_K_M", status: { value: "sleeping" } },
						{
							id: "org/downloading:Q4_K_M",
							status: {
								value: "downloading",
								progress: {
									one: { done: 4, total: 10 },
									two: { done: 8, total: 20 },
								},
							},
						},
					],
				}),
			),
		);

		await expect(listModels({ url: "http://localhost:8080", apiKey: "secret" })).resolves.toEqual([
			{ id: "org/ready:Q4_K_M", status: { value: "sleeping" } },
			{
				id: "org/downloading:Q4_K_M",
				status: {
					value: "downloading",
					progress: {
						one: { done: 4, total: 10 },
						two: { done: 8, total: 20 },
					},
				},
			},
		]);
		expect(fetchMock).toHaveBeenCalledWith(
			"http://localhost:8080/models",
			expect.objectContaining({ headers: { Authorization: "Bearer secret" } }),
		);
	});

	it("opens the authenticated model event stream with the caller's abort signal", async () => {
		fetchMock.mockResolvedValue(
			new Response("data: {}\n\n", { headers: { "Content-Type": "text/event-stream" } }),
		);
		const controller = new AbortController();

		const body = await openModelEventStream({
			url: "http://localhost:8080",
			apiKey: "secret",
			signal: controller.signal,
		});

		expect(body).toBeInstanceOf(ReadableStream);
		expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/models/sse", {
			headers: { Accept: "text/event-stream", Authorization: "Bearer secret" },
			signal: controller.signal,
		});
	});
});

describe("llama.cpp model mutations", () => {
	it("surfaces the router's download error", async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ error: { message: "model is gated" } }), { status: 403 }),
		);

		await expect(
			downloadModel({ url: "http://localhost:8080", model: "org/model:Q4_K_M" }),
		).rejects.toThrow("model is gated");
	});

	it("surfaces cancel and delete failures", async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ error: { message: "download not active" } }), { status: 404 }),
		);
		await expect(
			unloadModel({ url: "http://localhost:8080", model: "org/model:Q4_K_M" }),
		).rejects.toThrow("download not active");

		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ error: { message: "model is loaded" } }), { status: 409 }),
		);
		await expect(
			deleteModel({ url: "http://localhost:8080", model: "org/model:Q4_K_M" }),
		).rejects.toThrow("model is loaded");
		expect(fetchMock).toHaveBeenLastCalledWith(
			"http://localhost:8080/models?model=org%2Fmodel%3AQ4_K_M",
			{ method: "DELETE", headers: {} },
		);
	});
});
