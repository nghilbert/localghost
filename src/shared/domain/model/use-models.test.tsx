import { describe, expect, it, vi } from "vitest";
import type { PullProgress, RuntimeStatus } from "#/shared/domain/model/types";
import { useModelDownload } from "#/shared/domain/model/use-models";
import { renderHook, testQueryClient } from "#/test/utils";

const startModelDownload = vi.fn();

vi.mock("#/shared/domain/model/model.functions", () => ({
	libraryStatusQueryOptions: () => ({ queryKey: ["library-status"] }),
	modelDownloadProgressQueryOptions: (endpointId: string | null) => ({
		queryKey: ["model-download-progress", endpointId],
	}),
	cancelModelDownload: vi.fn(),
	deleteModel: vi.fn(),
	registerRemoteRuntime: vi.fn(),
	startModelDownload: (...args: unknown[]) => startModelDownload(...args),
	testRemoteRuntime: vi.fn(),
}));

const progressKey = ["model-download-progress", "endpoint-1"];

const status: RuntimeStatus = {
	found: true,
	runtimeUrl: "http://localhost:8080",
	endpointId: "endpoint-1",
	installedModels: [],
	downloads: { "org/model:Q4_K_M": { status: "Downloading" } },
};

describe("useModelDownload", () => {
	it("merges polled status with streamed byte progress and survives a poll tick", async () => {
		const queryClient = testQueryClient();
		queryClient.setQueryData(["library-status"], status);
		queryClient.setQueryData<Record<string, PullProgress>>(progressKey, {});
		const rendered = await renderHook(() => useModelDownload(), { queryClient });

		expect(rendered.result.current.pulling["org/model:Q4_K_M"]).toEqual({ status: "Downloading" });

		await rendered.act(() =>
			queryClient.setQueryData<Record<string, PullProgress>>(progressKey, {
				"org/model:Q4_K_M": { status: "Downloading", completed: 37, total: 120 },
			}),
		);
		expect(rendered.result.current.pulling["org/model:Q4_K_M"]).toEqual({
			status: "Downloading",
			completed: 37,
			total: 120,
		});

		// The poll re-reports the model with no byte counts; the streamed bytes must survive it.
		await rendered.act(() =>
			queryClient.setQueryData<RuntimeStatus>(["library-status"], {
				...status,
				downloads: { "org/model:Q4_K_M": { status: "Downloading" } },
			}),
		);
		expect(rendered.result.current.pulling["org/model:Q4_K_M"]).toEqual({
			status: "Downloading",
			completed: 37,
			total: 120,
		});

		// Once the poll drops the model the row goes away, stale byte cache or not.
		await rendered.act(() =>
			queryClient.setQueryData<RuntimeStatus>(["library-status"], {
				...status,
				downloads: {},
				installedModels: [
					{
						id: "org/model:Q4_K_M",
						sizeBytes: null,
						quant: "Q4_K_M",
						paramB: null,
						status: "unloaded",
						vision: false,
					},
				],
			}),
		);
		expect(rendered.result.current.pulling["org/model:Q4_K_M"]).toBeUndefined();
	});

	it("evicts the previous run's byte progress when a pull restarts", async () => {
		const queryClient = testQueryClient();
		queryClient.setQueryData(["library-status"], status);
		queryClient.setQueryData<Record<string, PullProgress>>(progressKey, {
			"org/model:Q4_K_M": { status: "Downloading", completed: 90, total: 120 },
		});
		const rendered = await renderHook(() => useModelDownload(), { queryClient });

		await rendered.act(() => rendered.result.current.pull("org/model:Q4_K_M"));

		expect(queryClient.getQueryData<Record<string, PullProgress>>(progressKey)).toEqual({});
	});
});
