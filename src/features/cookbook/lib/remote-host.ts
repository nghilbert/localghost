import { z } from "zod/v4";

/**
 * Hostnames or IPv4 addresses only — no scheme, path, port, credentials, or
 * whitespace. Used to validate the host field before assembling the base URL.
 */
export const HOSTNAME_OR_IP_REGEX =
	/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;

export function buildOllamaUrlFromHost(host: string, port: number): string {
	return `http://${host}:${port}`;
}

/**
 * A fully-formed Ollama base URL — used when connecting via the advanced "full URL"
 * field (TLS, reverse proxies, subpaths) where host+port can't express the address.
 * Only http(s) is allowed; the trailing slash is stripped so callers can append paths.
 */
export const OllamaUrlSchema = z.object({
	url: z
		.url("Enter a valid URL, e.g. https://ollama.example.com")
		.max(2048)
		.refine((value) => /^https?:\/\//i.test(value), "URL must start with http:// or https://")
		.transform((value) => value.replace(/\/+$/, "")),
});
