import { z } from "zod/v4";

/**
 * A user-entered Ollama base URL. `z.url` enforces a valid http(s) URL and the
 * WHATWG URL parser normalizes it to its origin, so callers can safely append
 * paths like `/api/tags` without worrying about trailing slashes.
 */
export const OllamaUrlSchema = z.object({
	url: z
		.url({ protocol: /^https?$/, error: "Enter a valid URL, e.g. http://192.168.1.50:11434" })
		.max(2048)
		.transform((value) => new URL(value).origin),
});
