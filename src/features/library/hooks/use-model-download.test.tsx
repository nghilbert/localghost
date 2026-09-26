import { describe, expect, it, vi } from "vitest";
import { useModelDownload } from "#/features/library/hooks/use-model-download";
import type { PullProgress, RuntimeStatus } from "#/features/library/library.types";
import { renderHook, testQueryClient } from "#/test/utils";

const { startModelDownload } = vi.hoisted(() => ({ startModelDownload: vi.fn() }));

vi.mock("#/features/library/library.functions", () => ({
	cancelModelDownload: vi.fn(),
	startModelDownload,
}));

// Seeded data only: each query sits on whatever the test writes into the cache.
vi.mock("#/features/library/library.queries", () => {
	const neverSettles = () => new Promise<never>(() => {});
	return {
		libraryQueries: {
			runtimeStatus: () => ({ queryKey: ["runtime-status"], queryFn: neverSettles }),
			downloadProgress: (endpointId: string | null) => ({
				queryKey: ["download-progress", endpointId],
				queryFn: neverSettles,
			}),
		},
	};
});

const progressKey = ["download-progress", "endpoint-1"];

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
		queryClient.setQueryData(["runtime-status"], status);
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

		// The poll re-reports the model with no byte counts; the streamed bytes survive it.
		await rendered.act(() =>
			queryClient.setQueryData<RuntimeStatus>(["runtime-status"], {
				...status,
				downloads: { "org/model:Q4_K_M": { status: "Downloading" } },
			}),
		);
		expect(rendered.result.current.pulling["org/model:Q4_K_M"]).toEqual({
			status: "Downloading",
			completed: 37,
			total: 120,
		});

		// Once the poll drops the model the entry goes away, stale byte cache or not.
		await rendered.act(() =>
			queryClient.setQueryData<RuntimeStatus>(["runtime-status"], {
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
		queryClient.setQueryData(["runtime-status"], status);
		queryClient.setQueryData<Record<string, PullProgress>>(progressKey, {
			"org/model:Q4_K_M": { status: "Downloading", completed: 90, total: 120 },
		});
		const rendered = await renderHook(() => useModelDownload(), { queryClient });

		await rendered.act(() => rendered.result.current.pull("org/model:Q4_K_M"));

		expect(queryClient.getQueryData<Record<string, PullProgress>>(progressKey)).toEqual({});
		await expect
			.poll(() => startModelDownload.mock.calls[0]?.[0])
			.toEqual({ data: { endpointId: "endpoint-1", model: "org/model:Q4_K_M" } });
	});
});
