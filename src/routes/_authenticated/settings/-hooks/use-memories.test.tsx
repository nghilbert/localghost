import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, testQueryClient } from "#/test/utils";

const { createMemory, toastAdd } = vi.hoisted(() => ({
	createMemory: vi.fn(),
	toastAdd: vi.fn(),
}));

vi.mock("#/shared/domain/memory/memory.functions", () => ({
	createMemory,
	deleteMemory: vi.fn(),
	updateMemory: vi.fn(),
}));

vi.mock("#/shared/components/ui/toast", () => ({ toast: { add: toastAdd } }));

const { useCreateMemory } = await import("#/routes/_authenticated/settings/-hooks/use-memories");

beforeEach(() => vi.clearAllMocks());

describe("useCreateMemory", () => {
	it("stays pending through invalidation before reporting success", async () => {
		const invalidation = Promise.withResolvers<void>();
		const queryClient = testQueryClient();
		vi.spyOn(queryClient, "invalidateQueries").mockReturnValue(invalidation.promise);
		createMemory.mockResolvedValue(undefined);
		const { result } = await renderHook(() => useCreateMemory(), { queryClient });

		result.current.mutate("Prefer metric units");

		await expect.poll(() => result.current.isPending).toBe(true);
		expect(toastAdd).not.toHaveBeenCalled();

		invalidation.resolve();
		await expect.poll(() => result.current.isSuccess).toBe(true);
		expect(toastAdd).toHaveBeenCalledOnce();
		expect(toastAdd.mock.calls[0]?.[0]?.type).toBe("success");
	});

	it("reports a rejected mutation exactly once", async () => {
		createMemory.mockRejectedValue(new Error("Save failed"));
		const { result } = await renderHook(() => useCreateMemory());

		result.current.mutate("Prefer metric units");

		await expect.poll(() => result.current.isError).toBe(true);
		expect(toastAdd).toHaveBeenCalledOnce();
		expect(toastAdd.mock.calls[0]?.[0]).toEqual({
			title: "Failed to save memory",
			type: "error",
			description: "Save failed",
		});
	});
});
