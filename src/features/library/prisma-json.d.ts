import type { z } from "zod";
import type { perModelOptionsSchema } from "./library.schemas";

declare global {
	namespace PrismaJson {
		/** `ModelSetting.options`: a model's sampling overrides. */
		type ModelOptions = z.infer<typeof perModelOptionsSchema>;
	}
}
