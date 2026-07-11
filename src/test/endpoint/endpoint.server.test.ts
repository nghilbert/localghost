import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Endpoint } from "#/generated/prisma/client";

const { decrypt } = vi.hoisted(() => ({ decrypt: vi.fn() }));

vi.mock("#/shared/lib/crypto.server", () => ({ decrypt, encrypt: vi.fn() }));
vi.mock("#/shared/lib/db.server", () => ({ prisma: {} }));

import { endpointApiKey, toClientEndpoint } from "#/entities/endpoint/endpoint.server";

beforeEach(() => {
	vi.clearAllMocks();
});

function makeEndpoint(overrides: Partial<Endpoint> = {}): Endpoint {
	return {
		id: "e1",
		name: "My endpoint",
		url: "https://api.openai.com",
		apiKeyEncrypted: null,
		provider: "openai",
		options: null,
		ownerId: "owner-1",
		updatedAt: new Date(),
		...overrides,
	};
}

describe("toClientEndpoint", () => {
	it("strips the encrypted key and reports hasApiKey true when one is stored", () => {
		const result = toClientEndpoint(makeEndpoint({ apiKeyEncrypted: "cipher-text" }));

		expect(result.apiKeyEncrypted).toBeUndefined();
		expect(result.hasApiKey).toBe(true);
	});

	it("reports hasApiKey false when no key is stored", () => {
		const result = toClientEndpoint(makeEndpoint({ apiKeyEncrypted: null }));

		expect(result.hasApiKey).toBe(false);
	});
});

describe("endpointApiKey", () => {
	it("decrypts a stored key", () => {
		decrypt.mockReturnValue("plain-text-key");
		expect(endpointApiKey({ apiKeyEncrypted: "cipher-text" })).toBe("plain-text-key");
		expect(decrypt).toHaveBeenCalledWith("cipher-text");
	});

	it("returns undefined when no key is stored", () => {
		expect(endpointApiKey({ apiKeyEncrypted: null })).toBeUndefined();
		expect(decrypt).not.toHaveBeenCalled();
	});

	it("logs and rethrows a readable error when the key can't be decrypted", () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		decrypt.mockImplementation(() => {
			throw new Error("Unsupported state or unable to authenticate data");
		});

		expect(() => endpointApiKey({ apiKeyEncrypted: "corrupt" })).toThrow(/re-enter the key/i);
		expect(consoleError).toHaveBeenCalledOnce();
	});
});
