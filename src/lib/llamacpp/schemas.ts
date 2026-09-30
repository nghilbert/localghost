import { z } from "zod";

/** One file's byte progress in a llama.cpp download. */
export const llamaDownloadFileProgressSchema = z.object({
	done: z.number().nonnegative(),
	total: z.number().nonnegative(),
});

/** One file's byte progress in a llama.cpp download. */
export type LlamaDownloadFileProgress = z.infer<typeof llamaDownloadFileProgressSchema>;

const llamaDownloadProgressEventSchema = z.object({
	model: z.string().min(1),
	event: z.literal("download_progress"),
	data: z.object({
		progress: z.record(z.string(), llamaDownloadFileProgressSchema),
	}),
});

/**
 * The `/models/sse` events we handle, copied from `notify_sse` in llama.cpp's
 * `server-models.cpp` at the version compose.yaml pins. Other events fail to parse and are dropped.
 */
export const llamaModelDownloadEventSchema = z.union([
	llamaDownloadProgressEventSchema,
	z.object({
		model: z.string().min(1),
		event: z.enum([
			"model_status",
			"status_change",
			"download_finished",
			"download_failed",
			"model_remove",
			"models_reload",
		]),
	}),
]);

/** A parsed `/models/sse` event. */
export type LlamaModelDownloadEvent = z.infer<typeof llamaModelDownloadEventSchema>;
