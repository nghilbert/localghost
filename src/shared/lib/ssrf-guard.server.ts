import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

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
	const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
	if (mapped?.[1]) return isPrivateIPv4(mapped[1]);
	return false;
}

/** @returns Whether the resolved address is not routable on the public internet. */
export function isPrivateAddress(address: string): boolean {
	const version = isIP(address);
	if (version === 4) return isPrivateIPv4(address);
	if (version === 6) return isPrivateIPv6(address);
	return true;
}

/**
 * Rejects a model-supplied URL that targets the local host or a private network.
 * @throws {UnsafeUrlError} If the scheme or resolved address is not public.
 */
export async function resolvePublicUrl(input: string): Promise<URL> {
	const url = new URL(input);
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new UnsafeUrlError("Only http and https URLs are allowed.");
	}
	let address: string;
	try {
		address = (await lookup(url.hostname)).address;
	} catch {
		throw new UnsafeUrlError(`Could not resolve host: ${url.hostname}`);
	}
	if (isPrivateAddress(address)) {
		throw new UnsafeUrlError("Refusing to fetch a local or private network address.");
	}
	return url;
}
