import { afterEach, describe, expect, it, vi } from "vitest";
import type { RuntimeStatus } from "#/shared/domain/model/types";
import { useModelDownloadEvents } from "#/shared/domain/model/use-model";
import { renderHook, testQueryClient } from "#/test/utils";

vi.mock("#/shared/domain/model/model.functions", () => ({
	libraryStatusQueryOptions: () => ({ queryKey: ["library-status"] }),
	cancelModelDownload: vi.fn(),
	deleteModel: vi.fn(),
	registerRemoteRuntime: vi.fn(),
	startModelDownload: vi.fn(),
	testRemoteRuntime: vi.fn(),
}));

class FakeEventSource {
	static current: FakeEventSource | undefined;
	readonly url: string;
	readonly close = vi.fn();
	onopen: (() => void) | null = null;
	onmessage: ((message: { data: string }) => void) | null = null;

	constructor(url: string | URL) {
		this.url = String(url);
		FakeEventSource.current = this;
	}
}

afterEach(() => {
	FakeEventSource.current = undefined;
	vi.unstubAllGlobals();
});

describe("useModelDownloadEvents", () => {
	it("resyncs on connection, patches progress, refreshes on completion, and closes", async () => {
		vi.stubGlobal("EventSource", FakeEventSource);
		const queryClient = testQueryClient();
		const status: RuntimeStatus = {
			found: true,
			runtimeUrl: "http://localhost:8080",
			endpointId: "endpoint-1",
			installedModels: [],
			downloads: {},
		};
		queryClient.setQueryData(["library-status"], status);
		const invalidate = vi.spyOn(queryClient, "invalidateQueries");
		const rendered = await renderHook(() => useModelDownloadEvents("endpoint-1"), { queryClient });
		await expect.poll(() => FakeEventSource.current).toBeDefined();
		const source = FakeEventSource.current;
		if (!source) throw new Error("expected an event source");
		expect(source.url).toContain("endpointId=endpoint-1");

		await rendered.act(() => source.onopen?.());
		expect(invalidate).toHaveBeenCalledWith({ queryKey: ["library-status"] });
		invalidate.mockClear();

		await rendered.act(() => source.onmessage?.({ data: "not json" }));
		expect(invalidate).not.toHaveBeenCalled();

		await rendered.act(() =>
			source.onmessage?.({
				data: JSON.stringify({
					model: "org/model:Q4_K_M",
					event: "download_progress",
					data: {
						progress: {
							one: { done: 25, total: 100 },
							two: { done: 12, total: 20 },
						},
					},
				}),
			}),
		);
		expect(queryClient.getQueryData<RuntimeStatus>(["library-status"])).toEqual({
			...status,
			downloads: {
				"org/model:Q4_K_M": { status: "Downloading", completed: 37, total: 120 },
			},
		});

		await rendered.act(() =>
			source.onmessage?.({
				data: JSON.stringify({
					model: "org/model:Q4_K_M",
					event: "download_finished",
					data: {},
				}),
			}),
		);
		expect(invalidate).toHaveBeenCalledWith({ queryKey: ["library-status"] });

		await rendered.unmount();
		expect(source.close).toHaveBeenCalledOnce();
	});
});
