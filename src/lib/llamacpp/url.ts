import { z } from "zod";

/** A llama.cpp server URL, reduced to its origin so paths like `/models` can be appended. */
export const llamacppUrlSchema = z.object({
	url: z
		.url({ protocol: /^https?$/, error: "Enter a valid URL, e.g. http://192.168.1.50:8080" })
		.max(2048)
		.transform((value) => new URL(value).origin),
});

/** Input for connecting a llama.cpp server. */
export const llamacppConnectionSchema = llamacppUrlSchema;
