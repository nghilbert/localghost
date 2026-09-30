import { beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "#/test/utils";
import { RuntimeConnectionForm } from "./RuntimeConnectionForm";

const { connectMutateAsync, testMutate, testReset } = vi.hoisted(() => ({
	connectMutateAsync: vi.fn(),
	testMutate: vi.fn(),
	testReset: vi.fn(),
}));

vi.mock("#/features/library/hooks/use-connect-runtime", () => ({
	useConnectRuntime: () => ({ mutateAsync: connectMutateAsync }),
}));

vi.mock("#/features/library/hooks/use-test-runtime", () => ({
	useTestRuntime: () => ({
		data: undefined,
		isPending: false,
		mutate: testMutate,
		reset: testReset,
	}),
}));

beforeEach(() => {
	vi.clearAllMocks();
	connectMutateAsync.mockResolvedValue(undefined);
});

describe("RuntimeConnectionForm", () => {
	it("submits a prefilled local runtime URL", async () => {
		const screen = await render(
			<RuntimeConnectionForm defaultUrl="http://localhost:8080" submitLabel="Save" />,
		);

		await userEvent.click(screen.getByRole("button", { name: "Save" }));

		await expect.poll(() => connectMutateAsync.mock.calls.length).toBe(1);
		expect(connectMutateAsync).toHaveBeenCalledWith({ url: "http://localhost:8080" });
	});

	it("tests a valid URL without saving it", async () => {
		const screen = await render(
			<RuntimeConnectionForm defaultUrl="http://localhost:8080" submitLabel="Save" />,
		);

		await userEvent.click(screen.getByRole("button", { name: "Test connection" }));

		expect(testReset).toHaveBeenCalledOnce();
		expect(testMutate.mock.calls[0]?.[0]).toBe("http://localhost:8080");
	});
});
