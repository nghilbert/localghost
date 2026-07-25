import { z } from "zod/v4";

/**
 * A user-entered llama.cpp (llama-server) base URL. `z.url` enforces a valid
 * http(s) URL and the WHATWG URL parser normalizes it to its origin, so callers
 * can safely append paths like `/models` without worrying about trailing slashes.
 */
export const llamacppUrlSchema = z.object({
	url: z
		.url({ protocol: /^https?$/, error: "Enter a valid URL, e.g. http://192.168.1.50:8080" })
		.max(2048)
		.transform((value) => new URL(value).origin),
});

/** `registerRemoteRuntime` input: just the base URL — `n_ctx` is read live from `/props`. */
export const llamacppConnectionSchema = llamacppUrlSchema;
