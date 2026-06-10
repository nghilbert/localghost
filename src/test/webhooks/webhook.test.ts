import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { validateWebhookUrl, WEBHOOK_EVENTS } from "#/lib/webhook.server";

// Mock prisma so validateWebhookUrl doesn't need DB; DNS mock for hostname checks
vi.mock("#/lib/db.server", () => ({ prisma: {} }));
vi.mock("#/lib/crypto.server", () => ({
	encrypt: vi.fn((s: string) => `enc:${s}`),
	decrypt: vi.fn((s: string) => s.replace("enc:", "")),
}));

vi.mock("node:dns/promises", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:dns/promises")>();
	return {
		...actual,
		resolve4: vi.fn().mockRejectedValue(new Error("NXDOMAIN")),
		resolve6: vi.fn().mockRejectedValue(new Error("NXDOMAIN")),
	};
});

describe("WEBHOOK_EVENTS", () => {
	it("contains expected events", () => {
		expect(WEBHOOK_EVENTS).toContain("chat.completed");
		expect(WEBHOOK_EVENTS).toContain("session.created");
		expect(WEBHOOK_EVENTS).toContain("chat.message");
	});

	it("is a non-empty tuple", () => {
		expect(WEBHOOK_EVENTS.length).toBeGreaterThan(0);
	});
});

describe("validateWebhookUrl", () => {
	it("rejects localhost", async () => {
		await expect(validateWebhookUrl("https://localhost/hook")).rejects.toThrow();
	});

	it("rejects 127.x.x.x", async () => {
		await expect(validateWebhookUrl("https://127.0.0.1")).rejects.toThrow();
	});

	it("rejects 10.x.x.x private ranges", async () => {
		await expect(validateWebhookUrl("https://10.0.0.1")).rejects.toThrow();
	});

	it("rejects 192.168.x.x", async () => {
		await expect(validateWebhookUrl("https://192.168.1.1")).rejects.toThrow();
	});

	it("rejects 172.16.x.x (private)", async () => {
		await expect(validateWebhookUrl("https://172.16.0.1")).rejects.toThrow();
	});

	it("rejects .local TLD", async () => {
		await expect(validateWebhookUrl("https://myservice.local/hook")).rejects.toThrow();
	});

	it("rejects .internal TLD", async () => {
		await expect(validateWebhookUrl("https://svc.internal/hook")).rejects.toThrow();
	});

	it("rejects non-http protocols", async () => {
		await expect(validateWebhookUrl("ftp://example.com")).rejects.toThrow();
	});

	it("rejects URLs longer than 2048 chars", async () => {
		const long = `https://203.0.113.5/${"a".repeat(2048)}`;
		await expect(validateWebhookUrl(long)).rejects.toThrow("too long");
	});

	it("rejects 0.0.0.0", async () => {
		await expect(validateWebhookUrl("https://0.0.0.0/hook")).rejects.toThrow();
	});
});

describe("HMAC-SHA256 signature algorithm", () => {
	it("produces a 64-char hex digest", () => {
		const sig = createHmac("sha256", "secret").update("payload").digest("hex");
		expect(sig).toMatch(/^[0-9a-f]{64}$/);
	});

	it("is consistent with Node's createHmac behavior", () => {
		const body = JSON.stringify({ event: "chat.completed", data: {} });
		const secret = "mysecret";
		const sig1 = createHmac("sha256", secret).update(body).digest("hex");
		const sig2 = createHmac("sha256", secret).update(body).digest("hex");
		expect(sig1).toBe(sig2);
	});

	it("different secrets produce different signatures", () => {
		const body = "payload";
		const s1 = createHmac("sha256", "secret1").update(body).digest("hex");
		const s2 = createHmac("sha256", "secret2").update(body).digest("hex");
		expect(s1).not.toBe(s2);
	});

	it("different bodies produce different signatures", () => {
		const secret = "secret";
		const s1 = createHmac("sha256", secret).update("body1").digest("hex");
		const s2 = createHmac("sha256", secret).update("body2").digest("hex");
		expect(s1).not.toBe(s2);
	});
});
