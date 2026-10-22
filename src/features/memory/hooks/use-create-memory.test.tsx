import { useQuery } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { useCreateMemory } from "#/features/memory/hooks/use-create-memory";
import type {
	createMemory as createMemoryFn,
	listMemories as listMemoriesFn,
} from "#/features/memory/memory.functions";
import { memoryQueries } from "#/features/memory/memory.queries";
import { renderHook } from "#/test/utils";

type MemoryList = Awaited<ReturnType<typeof listMemoriesFn>>;

const { createMemory, listMemories } = vi.hoisted(() => ({
	createMemory: vi.fn<typeof createMemoryFn>(),
	listMemories: vi.fn<typeof listMemoriesFn>(),
}));

vi.mock("#/features/memory/memory.functions", () => ({ createMemory, listMemories }));

/** The hook, rendered beside the memory list it refreshes. */
function renderWithList() {
	return renderHook(() => {
		useQuery(memoryQueries.list());
		return useCreateMemory();
	});
}

describe("useCreateMemory", () => {
	it("saves the text and confirms only after the memory list has refreshed", async () => {
		listMemories.mockResolvedValue([]);
		createMemory.mockResolvedValue(undefined);
		const { result } = await renderWithList();
		await expect.poll(() => listMemories.mock.calls.length).toBe(1);
		const refetch = Promise.withResolvers<MemoryList>();
		listMemories.mockReturnValueOnce(refetch.promise);

		result.current.mutate("Prefer metric units");

		await expect.poll(() => listMemories.mock.calls.length).toBe(2);
		expect(createMemory).toHaveBeenCalledExactlyOnceWith({ data: { text: "Prefer metric units" } });
		const saved = page.getByRole("dialog", { name: "Memory saved" });
		await expect.element(saved).not.toBeInTheDocument();
		expect(result.current.isPending).toBe(true);

		refetch.resolve([]);

		await expect.element(saved).toBeVisible();
		expect(result.current.isSuccess).toBe(true);
	});

	it("reports a failed save once, with the server's message", async () => {
		listMemories.mockResolvedValue([]);
		createMemory.mockRejectedValue(new Error("Save failed"));
		const { result } = await renderWithList();

		result.current.mutate("Prefer metric units");

		await expect
			.element(page.getByRole("dialog", { name: "Failed to save memory" }))
			.toMatchTextContent("Save failed");
		expect(page.getByRole("dialog").elements()).toHaveLength(1);
	});
});
