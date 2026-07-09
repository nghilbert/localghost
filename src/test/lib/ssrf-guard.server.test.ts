import { describe, expect, it, vi } from "vitest";
import { isPrivateAddress } from "#/shared/lib/ssrf-guard.server";

describe("isPrivateAddress", () => {
	it("flags loopback, private, and link-local IPv4 ranges", () => {
		expect(isPrivateAddress("127.0.0.1")).toBe(true);
		expect(isPrivateAddress("10.0.0.5")).toBe(true);
		expect(isPrivateAddress("172.16.0.1")).toBe(true);
		expect(isPrivateAddress("192.168.1.1")).toBe(true);
		expect(isPrivateAddress("169.254.169.254")).toBe(true);
	});

	it("allows public IPv4 addresses", () => {
		expect(isPrivateAddress("93.184.216.34")).toBe(false);
		expect(isPrivateAddress("8.8.8.8")).toBe(false);
	});

	it("flags loopback and unique-local IPv6 ranges", () => {
		expect(isPrivateAddress("::1")).toBe(true);
		expect(isPrivateAddress("fe80::1")).toBe(true);
		expect(isPrivateAddress("fd00::1")).toBe(true);
	});

	it("allows a public IPv6 address", () => {
		expect(isPrivateAddress("2606:4700:4700::1111")).toBe(false);
	});
});

vi.mock("node:dns/promises", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:dns/promises")>();
	return { ...actual, lookup: vi.fn() };
});

describe("resolvePublicUrl", () => {
	it("rejects a non-http(s) scheme before resolving", async () => {
		const { resolvePublicUrl, UnsafeUrlError } = await import("#/shared/lib/ssrf-guard.server");
		await expect(resolvePublicUrl("file:///etc/passwd")).rejects.toThrow(UnsafeUrlError);
	});

	it("rejects a hostname that resolves to a private address", async () => {
		const { lookup } = await import("node:dns/promises");
		vi.mocked(lookup).mockResolvedValue({ address: "127.0.0.1", family: 4 });
		const { resolvePublicUrl, UnsafeUrlError } = await import("#/shared/lib/ssrf-guard.server");
		await expect(resolvePublicUrl("http://localhost/")).rejects.toThrow(UnsafeUrlError);
	});

	it("allows a hostname that resolves to a public address", async () => {
		const { lookup } = await import("node:dns/promises");
		vi.mocked(lookup).mockResolvedValue({ address: "93.184.216.34", family: 4 });
		const { resolvePublicUrl } = await import("#/shared/lib/ssrf-guard.server");
		const url = await resolvePublicUrl("https://example.com/");
		expect(url.hostname).toBe("example.com");
	});
});
