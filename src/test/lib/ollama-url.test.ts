import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOllamaUrl } from "#/lib/ollama.server";

const { findFirst } = vi.hoisted(() => ({ findFirst: vi.fn() }));

vi.mock("#/lib/db.server", () => ({ prisma: { modelEndpoint: { findFirst } } }));

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
		vi.stubEnv("OLLAMA_URL", "http://env-ollama:11434");
		await expect(getOllamaUrl("user-1")).resolves.toBe("http://my-ollama:9999");
	});

	it("falls back to OLLAMA_URL when no endpoint is configured", async () => {
		findFirst.mockResolvedValue(null);
		vi.stubEnv("OLLAMA_URL", "http://env-ollama:11434///");
		await expect(getOllamaUrl("user-1")).resolves.toBe("http://env-ollama:11434");
	});

	it("falls back to localhost when neither endpoint nor env is set", async () => {
		findFirst.mockResolvedValue(null);
		vi.stubEnv("OLLAMA_URL", "");
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
