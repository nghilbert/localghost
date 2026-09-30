import { beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "#/test/utils";
import { MemoryCreateForm } from "./MemoryCreateForm";

const { createMemoryMutateAsync } = vi.hoisted(() => ({ createMemoryMutateAsync: vi.fn() }));

vi.mock("#/features/memory/hooks/use-create-memory", () => ({
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
		const input = screen.getByRole("textbox", { name: "New memory" });

		await userEvent.fill(input, "  Prefer metric units  ");
		await userEvent.click(screen.getByRole("button", { name: "Add memory" }));

		await expect.poll(() => createMemoryMutateAsync.mock.calls.length).toBe(1);
		expect(createMemoryMutateAsync.mock.calls[0]?.[0]).toBe("Prefer metric units");
		await expect.element(input).toHaveValue("  Prefer metric units  ");

		submission.resolve();
		await expect.element(input).toHaveValue("");
	});

	it("retains a new memory when saving fails", async () => {
		createMemoryMutateAsync.mockRejectedValue(new Error("Memory failed"));
		const screen = await render(<MemoryCreateForm />);
		const input = screen.getByRole("textbox", { name: "New memory" });
		const submit = screen.getByRole("button", { name: "Add memory" });

		await userEvent.fill(input, "Keep this value");
		await userEvent.click(submit);

		await expect.element(submit).toBeEnabled();
		await expect.element(input).toHaveValue("Keep this value");
	});
});
