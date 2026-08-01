import type { LookupAddress, LookupOptions } from "node:dns";
import { lookup } from "node:dns";
import { isIP } from "node:net";
import { Agent } from "undici";

/** Thrown when a URL resolves to a host the agent must not fetch. */
export class UnsafeUrlError extends Error {}

/** Whether a resolved IPv4 address is loopback, link-local, or a private range. */
function isPrivateIPv4(address: string): boolean {
	const octets = address.split(".").map(Number);
	if (octets.length !== 4 || octets.some((n) => Number.isNaN(n))) return true;
	const [a, b] = octets;
	if (a === undefined || b === undefined) return true;
	if (a === 0 || a === 10 || a === 127) return true;
	if (a === 169 && b === 254) return true;
	if (a === 172 && b >= 16 && b <= 31) return true;
	if (a === 192 && b === 168) return true;
	return false;
}

/** Whether a resolved IPv6 address is loopback, link-local, or unique-local. */
function isPrivateIPv6(address: string): boolean {
	const lower = address.toLowerCase();
	if (lower === "::1" || lower === "::") return true;
	if (lower.startsWith("fe80:")) return true;
	if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
	if (lower.startsWith("::ffff:")) return isPrivateIPv4(lower.slice("::ffff:".length));
	return false;
}

/** @returns Whether the resolved address is not routable on the public internet. */
export function isPrivateAddress(address: string): boolean {
	const version = isIP(address);
	if (version === 4) return isPrivateIPv4(address);
	if (version === 6) return isPrivateIPv6(address);
	return true;
}

/** Rejects DNS results containing no addresses or any private address.
 * @throws {UnsafeUrlError} If the answer is empty or any address is private.
 */
export function assertPublicAddresses(addresses: LookupAddress[]): LookupAddress[] {
	const [first] = addresses;
	if (!first || addresses.some((entry) => isPrivateAddress(entry.address))) {
		throw new UnsafeUrlError("Refusing to fetch a local or private network address.");
	}
	return addresses;
}

/** DNS lookup that validates the exact addresses passed to the connector. */
function publicOnlyLookup(
	hostname: string,
	options: LookupOptions,
	callback: (
		err: NodeJS.ErrnoException | null,
		address: string | LookupAddress[],
		family?: number,
	) => void,
): void {
	lookup(hostname, { ...options, all: true }, (err, addresses) => {
		if (err) {
			callback(err, []);
			return;
		}
		let safe: LookupAddress[];
		try {
			safe = assertPublicAddresses(addresses);
		} catch (unsafeErr) {
			callback(unsafeErr instanceof Error ? unsafeErr : new UnsafeUrlError("Unsafe address."), []);
			return;
		}
		const [first] = safe;
		if (options.all || !first) {
			callback(null, safe);
			return;
		}
		callback(null, first.address, first.family);
	});
}

/**
 * Fetch dispatcher whose connector re-validates DNS at connect time via
 * {@link publicOnlyLookup}. Pass as `dispatcher` to undici's `fetch` for any
 * model-supplied URL.
 */
export const publicOnlyDispatcher = new Agent({ connect: { lookup: publicOnlyLookup } });

/** Rejects non-HTTP(S) URLs and private literal-IP hosts.
 * Hostnames are checked by {@link publicOnlyDispatcher} at connection time.
 * @throws {UnsafeUrlError} If the scheme is not http(s) or a literal IP host is private.
 */
export function assertPublicUrl(input: string): URL {
	const url = new URL(input);
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new UnsafeUrlError("Only http and https URLs are allowed.");
	}
	// WHATWG URL keeps IPv6 hosts bracketed; strip for isIP/isPrivateAddress.
	const host =
		url.hostname.startsWith("[") && url.hostname.endsWith("]")
			? url.hostname.slice(1, -1)
			: url.hostname;
	if (isIP(host) !== 0 && isPrivateAddress(host)) {
		throw new UnsafeUrlError("Refusing to fetch a local or private network address.");
	}
	return url;
}
