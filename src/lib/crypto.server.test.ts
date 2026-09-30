import { describe, expect, it, vi } from "vitest";

const VALID_KEY = "a".repeat(64); // 32-byte hex key

describe("crypto.server", () => {
	describe("encrypt", () => {
		it("should return a string in iv:tag:ciphertext format", async () => {
			process.env.ENCRYPTION_KEY = VALID_KEY;
			const { encrypt } = await import("#/lib/crypto.server");
			const result = encrypt("hello");
			const [ivHex, tagHex, cipherHex] = result.split(":");
			expect(ivHex).toHaveLength(24); // 12-byte IV = 24 hex chars
			expect(tagHex).toHaveLength(32); // 16-byte GCM tag = 32 hex chars
			expect(cipherHex?.length).toBeGreaterThan(0);
		});

		it("should produce a different ciphertext each call (random IV)", async () => {
			process.env.ENCRYPTION_KEY = VALID_KEY;
			const { encrypt } = await import("#/lib/crypto.server");
			expect(encrypt("same")).not.toBe(encrypt("same"));
		});

		it("should throw when ENCRYPTION_KEY is missing", async () => {
			delete process.env.ENCRYPTION_KEY;
			const { encrypt } = await import("#/lib/crypto.server");
			expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY");
		});

		it("should throw when ENCRYPTION_KEY is wrong length", async () => {
			process.env.ENCRYPTION_KEY = "tooshort";
			const { encrypt } = await import("#/lib/crypto.server");
			expect(() => encrypt("test")).toThrow("32-byte");
		});
	});

	describe("decrypt", () => {
		it("should round-trip plaintext", async () => {
			process.env.ENCRYPTION_KEY = VALID_KEY;
			const { encrypt, decrypt } = await import("#/lib/crypto.server");
			const plaintext = "super secret value";
			expect(decrypt(encrypt(plaintext))).toBe(plaintext);
		});

		it("should round-trip unicode and special characters", async () => {
			process.env.ENCRYPTION_KEY = VALID_KEY;
			const { encrypt, decrypt } = await import("#/lib/crypto.server");
			const plaintext = "sk-abc123 🔑 <>&\"'";
			expect(decrypt(encrypt(plaintext))).toBe(plaintext);
		});

		it("should throw on invalid ciphertext format", async () => {
			process.env.ENCRYPTION_KEY = VALID_KEY;
			const { decrypt } = await import("#/lib/crypto.server");
			expect(() => decrypt("notvalidformat")).toThrow();
		});

		it("should throw when ciphertext is tampered", async () => {
			process.env.ENCRYPTION_KEY = VALID_KEY;
			const { encrypt, decrypt } = await import("#/lib/crypto.server");
			const parts = encrypt("hello").split(":");
			parts[2] = "deadbeef";
			expect(() => decrypt(parts.join(":"))).toThrow();
		});
	});

	describe("endpointApiKey", () => {
		it("decrypts a stored key", async () => {
			process.env.ENCRYPTION_KEY = VALID_KEY;
			const { encrypt, endpointApiKey } = await import("#/lib/crypto.server");
			expect(endpointApiKey({ apiKeyEncrypted: encrypt("plain-text-key") })).toBe("plain-text-key");
		});

		it("returns undefined when no key is stored", async () => {
			const { endpointApiKey } = await import("#/lib/crypto.server");
			expect(endpointApiKey({ apiKeyEncrypted: null })).toBeUndefined();
		});

		it("logs and rethrows a readable error when the key can't be decrypted", async () => {
			process.env.ENCRYPTION_KEY = VALID_KEY;
			const { endpointApiKey } = await import("#/lib/crypto.server");
			const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

			expect(() => endpointApiKey({ apiKeyEncrypted: "a:b:c" })).toThrow(/re-enter the key/i);
			expect(consoleError).toHaveBeenCalledOnce();
			consoleError.mockRestore();
		});
	});
});
