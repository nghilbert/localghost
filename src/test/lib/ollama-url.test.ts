import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildOllamaCandidateUrls, getOllamaUrl, upsertOllamaEndpoint } from "#/lib/ollama.server";

const { findFirst, findMany, create, update } = vi.hoisted(() => ({
	findFirst: vi.fn(),
	findMany: vi.fn(),
	create: vi.fn(),
	update: vi.fn(),
}));

vi.mock("#/lib/db.server", () => ({
	prisma: { modelEndpoint: { findFirst, findMany, create, update } },
}));

describe("getOllamaUrl", () => {
	beforeEach(() => {
		findFirst.mockReset();
		vi.unstubAllEnvs();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("prefers the user's configured ollama endpoint", async () => {
		findFirst.mockResolvedValue({ url: "http://my-ollama:9999/" });
		await expect(getOllamaUrl("user-1")).resolves.toBe("http://my-ollama:9999");
	});

	it("falls back to localhost when endpoint is set", async () => {
		findFirst.mockResolvedValue(null);
		await expect(getOllamaUrl("user-1")).resolves.toBe("http://localhost:11434");
	});

	it("queries the oldest ollama endpoint for the user", async () => {
		findFirst.mockResolvedValue(null);
		await getOllamaUrl("user-42");
		expect(findFirst).toHaveBeenCalledWith({
			where: { ownerId: "user-42", provider: "ollama" },
			orderBy: { createdAt: "asc" },
		});
	});
});

describe("buildOllamaCandidateUrls", () => {
	it("orders saved urls before well-known addresses", () => {
		expect(buildOllamaCandidateUrls({ savedUrls: ["http://my-server:11434"] })).toEqual([
			"http://my-server:11434",
			"http://localhost:11434",
			"http://127.0.0.1:11434",
			"http://ollama:11434",
			"http://host.docker.internal:11434",
		]);
	});

	it("dedupes after normalizing trailing slashes", () => {
		const candidates = buildOllamaCandidateUrls({ savedUrls: ["http://localhost:11434///"] });
		expect(candidates).toEqual([
			"http://localhost:11434",
			"http://127.0.0.1:11434",
			"http://ollama:11434",
			"http://host.docker.internal:11434",
		]);
	});
});

describe("upsertOllamaEndpoint", () => {
	beforeEach(() => {
		findFirst.mockReset();
		create.mockReset();
		update.mockReset();
	});

	it("creates an ollama endpoint on first detection", async () => {
		findFirst.mockResolvedValue(null);
		await upsertOllamaEndpoint("user-1", "http://localhost:11434/");
		expect(create).toHaveBeenCalledWith({
			data: {
				name: "Ollama (local)",
				url: "http://localhost:11434",
				provider: "ollama",
				ownerId: "user-1",
			},
		});
		expect(update).not.toHaveBeenCalled();
	});

	it("updates the existing endpoint when ollama moved", async () => {
		findFirst.mockResolvedValue({ id: "ep-1", url: "http://old-host:11434" });
		await upsertOllamaEndpoint("user-1", "http://localhost:11434");
		expect(update).toHaveBeenCalledWith({
			where: { id: "ep-1" },
			data: { url: "http://localhost:11434" },
		});
		expect(create).not.toHaveBeenCalled();
	});

	it("does nothing when the saved url already matches", async () => {
		findFirst.mockResolvedValue({ id: "ep-1", url: "http://localhost:11434" });
		await upsertOllamaEndpoint("user-1", "http://localhost:11434/");
		expect(create).not.toHaveBeenCalled();
		expect(update).not.toHaveBeenCalled();
	});
});
