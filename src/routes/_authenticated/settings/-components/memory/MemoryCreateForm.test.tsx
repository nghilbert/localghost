import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryCreateForm } from "#/routes/_authenticated/settings/-components/memory/MemoryCreateForm";
import { render } from "#/test/utils";

const { createMemoryMutateAsync } = vi.hoisted(() => ({
	createMemoryMutateAsync: vi.fn(),
}));

vi.mock("#/routes/_authenticated/settings/-hooks/use-memories", () => ({
	useCreateMemory: () => ({ mutateAsync: createMemoryMutateAsync }),
}));

beforeEach(() => {
	vi.clearAllMocks();
	createMemoryMutateAsync.mockResolvedValue(undefined);
});

describe("MemoryCreateForm", () => {
	it("clears a new memory only after it is saved", async () => {
		const submission = Promise.withResolvers<void>();
		createMemoryMutateAsync.mockImplementation((_text, options) =>
			submission.promise.then(() => options?.onSuccess?.()),
		);
		const screen = await render(<MemoryCreateForm />);

		await screen.getByTestId("text-input").fill("  Prefer metric units  ");
		await screen.getByTestId("memory-create-submit").click();

		await expect.poll(() => createMemoryMutateAsync.mock.calls.length).toBe(1);
		expect(createMemoryMutateAsync.mock.calls[0]?.[0]).toBe("Prefer metric units");
		await expect.element(screen.getByTestId("text-input")).toHaveValue("  Prefer metric units  ");

		submission.resolve();
		await expect.element(screen.getByTestId("text-input")).toHaveValue("");
	});

	it("retains a new memory when saving fails", async () => {
		createMemoryMutateAsync.mockRejectedValue(new Error("Memory failed"));
		const screen = await render(<MemoryCreateForm />);

		await screen.getByTestId("text-input").fill("Keep this value");
		await screen.getByTestId("memory-create-submit").click();

		await expect.element(screen.getByTestId("memory-create-submit")).toBeEnabled();
		await expect.element(screen.getByTestId("text-input")).toHaveValue("Keep this value");
	});
});
