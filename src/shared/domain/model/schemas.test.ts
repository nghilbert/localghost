import { describe, expect, it } from "vitest";
import { aggregatePullProgress } from "#/shared/domain/model/pull-progress";
import { llamaModelDownloadEventSchema } from "#/shared/domain/model/schemas";

/** Frame shapes captured off a live llama.cpp router (b10380). */
const modelStatus = {
	model: "ggml-org/gemma-3-270m-GGUF:Q8_0",
	event: "model_status",
	data: { status: "downloading" },
};
const downloadProgress = {
	model: "ggml-org/gemma-3-270m-GGUF:Q8_0",
	event: "download_progress",
	data: { progress: { "https://huggingface.co/…/gemma-3-270m-Q8_0.gguf": { done: 4, total: 10 } } },
};
/** A load-time frame: the router streams these while a multimodal model's mmproj loads. */
const statusChange = {
	model: "unsloth/Qwen3.5-4B-GGUF:Q4_K_M",
	event: "status_change",
	data: {
		status: "loading",
		progress: { stages: ["text_model", "mmproj_model"], current: "mmproj_model", value: 0.5 },
	},
};

describe("llamaModelDownloadEventSchema", () => {
	it("accepts the router's status and progress frames", () => {
		expect(llamaModelDownloadEventSchema.parse(modelStatus).event).toBe("model_status");
		expect(llamaModelDownloadEventSchema.parse(statusChange).event).toBe("status_change");

		const parsed = llamaModelDownloadEventSchema.parse(downloadProgress);
		if (parsed.event !== "download_progress") throw new Error("expected a progress event");
		expect(aggregatePullProgress(parsed.data.progress)).toEqual({
			status: "Downloading",
			completed: 4,
			total: 10,
		});
	});

	it("rejects a frame whose progress entries are not byte counts", () => {
		const result = llamaModelDownloadEventSchema.safeParse({
			...downloadProgress,
			data: { progress: { file: { done: 4 } } },
		});
		expect(result.success).toBe(false);
	});
});
