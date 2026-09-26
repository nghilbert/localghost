import type { LookupAddress, LookupOptions } from "node:dns";
import { lookup } from "node:dns";
import { isIP } from "node:net";
import { Agent } from "undici";

/** Thrown when a URL points at a local or private network address. */
export class UnsafeUrlError extends Error {}

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

function isPrivateIPv6(address: string): boolean {
	const lower = address.toLowerCase();
	if (lower === "::1" || lower === "::") return true;
	if (lower.startsWith("fe80:")) return true;
	if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
	if (lower.startsWith("::ffff:")) return isPrivateIPv4(lower.slice("::ffff:".length));
	return false;
}

/** Whether an IP address is not reachable on the public internet. Non-IPs count as private. */
export function isPrivateAddress(address: string): boolean {
	const version = isIP(address);
	if (version === 4) return isPrivateIPv4(address);
	if (version === 6) return isPrivateIPv6(address);
	return true;
}

/**
 * Returns DNS results unchanged when all of them are public.
 * @throws {UnsafeUrlError} If there are none or any is private.
 */
export function assertPublicAddresses(addresses: LookupAddress[]): LookupAddress[] {
	const [first] = addresses;
	if (!first || addresses.some((entry) => isPrivateAddress(entry.address))) {
		throw new UnsafeUrlError("Refusing to fetch a local or private network address.");
	}
	return addresses;
}

/** A DNS lookup that checks the exact addresses the connection will use. */
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

/** An undici `dispatcher` that refuses to connect to private addresses. Use it for any model-supplied URL. */
export const publicOnlyDispatcher = new Agent({ connect: { lookup: publicOnlyLookup } });

/**
 * Parses a URL, rejecting non-http(s) schemes and private IP hosts. Hostnames are
 * checked later by {@link publicOnlyDispatcher}.
 * @throws {UnsafeUrlError} If the URL is not allowed.
 */
export function assertPublicUrl(input: string): URL {
	const url = new URL(input);
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new UnsafeUrlError("Only http and https URLs are allowed.");
	}
	// `URL` keeps IPv6 hosts in brackets.
	const host =
		url.hostname.startsWith("[") && url.hostname.endsWith("]")
			? url.hostname.slice(1, -1)
			: url.hostname;
	if (isIP(host) !== 0 && isPrivateAddress(host)) {
		throw new UnsafeUrlError("Refusing to fetch a local or private network address.");
	}
	return url;
}
