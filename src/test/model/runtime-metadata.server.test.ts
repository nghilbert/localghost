import { describe, expect, it, vi } from "vitest";

const { serverProps } = vi.hoisted(() => ({ serverProps: vi.fn() }));

vi.mock("#/shared/lib/llamacpp/client.server", () => ({ serverProps }));

import { getContextWindow } from "#/shared/domain/model/runtime-metadata.server";

describe("getContextWindow", () => {
	it("reads and caches a loaded model's context window", async () => {
		serverProps.mockResolvedValueOnce({ n_ctx: 32_768 });
		const input = {
			url: "http://llamacpp:8080",
			model: "example/Qwen:Q4_K_M",
			apiKey: "key-1",
		};

		await expect(getContextWindow(input)).resolves.toBe(32_768);
		await expect(getContextWindow(input)).resolves.toBe(32_768);
		expect(serverProps).toHaveBeenCalledTimes(1);
		expect(serverProps).toHaveBeenCalledWith({ ...input, timeoutMs: 2000 });
	});

	it("returns undefined when llama-server does not expose model props", async () => {
		serverProps.mockRejectedValueOnce(new Error("not loaded"));

		await expect(
			getContextWindow({
				url: "http://llamacpp:8080",
				model: "example/failing-model:Q4_K_M",
			}),
		).resolves.toBeUndefined();
	});
});
