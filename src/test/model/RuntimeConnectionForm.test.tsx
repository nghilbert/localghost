import { beforeEach, describe, expect, it, vi } from "vitest";
import { RuntimeConnectionForm } from "#/shared/domain/model/RuntimeConnectionForm";
import { render } from "#/test/utils";

const { connectMutateAsync, testMutate, testReset } = vi.hoisted(() => ({
	connectMutateAsync: vi.fn(),
	testMutate: vi.fn(),
	testReset: vi.fn(),
}));

vi.mock("#/shared/domain/model/use-runtime", () => ({
	useConnectRuntime: () => ({ mutateAsync: connectMutateAsync }),
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

		await screen.getByTestId("runtime-connect-submit").click();

		await expect.poll(() => connectMutateAsync.mock.calls.length).toBe(1);
		expect(connectMutateAsync).toHaveBeenCalledWith({ url: "http://localhost:8080" });
	});

	it("supports the remote composition and its parent-owned cancel callback", async () => {
		const onCancel = vi.fn();
		const screen = await render(
			<RuntimeConnectionForm defaultUrl="" submitLabel="Connect" onCancel={onCancel} />,
		);

		await screen.getByTestId("url-input").fill("https://runtime.example.com:8080");
		await screen.getByTestId("runtime-connect-submit").click();
		await expect.poll(() => connectMutateAsync.mock.calls.length).toBe(1);
		expect(connectMutateAsync).toHaveBeenCalledWith({
			url: "https://runtime.example.com:8080",
		});

		await screen.getByTestId("runtime-cancel-button").click();
		expect(onCancel).toHaveBeenCalledOnce();
	});

	it("tests a valid URL without saving it", async () => {
		const screen = await render(
			<RuntimeConnectionForm defaultUrl="http://localhost:8080" submitLabel="Save" />,
		);

		await screen.getByTestId("runtime-test-button").click();

		expect(testReset).toHaveBeenCalledOnce();
		expect(testMutate.mock.calls[0]?.[0]).toBe("http://localhost:8080");
	});
});
