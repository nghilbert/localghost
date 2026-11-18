import type { z } from "zod";
import type { samplingOptionsSchema } from "#/lib/llm-schemas";

declare global {
	namespace PrismaJson {
		/** `Endpoint.options`: the endpoint's sampling defaults. */
		type SamplingOptions = z.infer<typeof samplingOptionsSchema>;
	}
}
