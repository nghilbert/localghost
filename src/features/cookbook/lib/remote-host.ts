import { z } from "zod/v4";

/**
 * Hostnames or IPv4 addresses only — no scheme, path, port, credentials, or
 * whitespace. The URL is always assembled server-side from validated parts.
 */
export const HOSTNAME_OR_IP_REGEX =
	/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;

export const RemoteHostSchema = z.object({
	host: z
		.string()
		.trim()
		.min(1, "Host is required")
		.max(253)
		.regex(HOSTNAME_OR_IP_REGEX, "Enter a hostname or IP address — no http:// or port"),
	port: z.int().min(1).max(65535).default(11434),
});

export type RemoteHost = z.infer<typeof RemoteHostSchema>;

export function buildOllamaUrlFromHost(host: string, port: number): string {
	return `http://${host}:${port}`;
}
