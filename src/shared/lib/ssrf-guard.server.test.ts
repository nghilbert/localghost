import { describe, expect, it } from "vitest";
import {
	assertPublicAddresses,
	assertPublicUrl,
	isPrivateAddress,
	UnsafeUrlError,
} from "#/shared/lib/ssrf-guard.server";

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

	it("flags an IPv4-mapped IPv6 address by its embedded IPv4 range", () => {
		expect(isPrivateAddress("::ffff:127.0.0.1")).toBe(true);
		expect(isPrivateAddress("::ffff:10.0.0.5")).toBe(true);
	});

	it("allows an IPv4-mapped IPv6 address with a public embedded address", () => {
		expect(isPrivateAddress("::ffff:93.184.216.34")).toBe(false);
	});

	it("treats a malformed ::ffff: mapping as private rather than letting it through", () => {
		expect(isPrivateAddress("::ffff:not-an-ip")).toBe(true);
	});
});

describe("assertPublicAddresses", () => {
	it("rejects a multi-record answer mixing public and private addresses", () => {
		expect(() =>
			assertPublicAddresses([
				{ address: "93.184.216.34", family: 4 },
				{ address: "10.0.0.5", family: 4 },
			]),
		).toThrow(UnsafeUrlError);
	});

	it("rejects an empty answer", () => {
		expect(() => assertPublicAddresses([])).toThrow(UnsafeUrlError);
	});

	it("returns an all-public answer unchanged", () => {
		const addresses = [
			{ address: "93.184.216.34", family: 4 },
			{ address: "2606:4700:4700::1111", family: 6 },
		];
		expect(assertPublicAddresses(addresses)).toBe(addresses);
	});
});

describe("assertPublicUrl", () => {
	it("rejects a non-http(s) scheme", () => {
		expect(() => assertPublicUrl("file:///etc/passwd")).toThrow(UnsafeUrlError);
	});

	it("rejects a private literal IP host, including obfuscated forms", () => {
		expect(() => assertPublicUrl("http://127.0.0.1/")).toThrow(UnsafeUrlError);
		expect(() => assertPublicUrl("http://[::1]/")).toThrow(UnsafeUrlError);
		// WHATWG URL normalizes hex IPv4 literals to dotted decimal.
		expect(() => assertPublicUrl("http://0x7f000001/")).toThrow(UnsafeUrlError);
	});

	it("allows a public literal IP host", () => {
		expect(assertPublicUrl("http://93.184.216.34/").hostname).toBe("93.184.216.34");
	});

	it("passes a hostname through without resolving it", () => {
		expect(assertPublicUrl("https://example.com/").hostname).toBe("example.com");
	});
});
