import { describe, expect, it, vi } from "vitest";
import { ModelPicker } from "#/features/send-message/components/ChatInput/ModelPicker";
import { render } from "#/test/utils";

const endpoints = [
	{ id: "e1", name: "Local" },
	{ id: "e2", name: "Cloud" },
];

vi.mock("#/entities/endpoint/use-endpoints", () => ({
	useEndpoints: () => ({ endpoints }),
}));

// The RPC boundary: mocking it keeps browser tests off the server-only import graph.
vi.mock("#/entities/endpoint/endpoint.functions", () => ({
	endpointModelsQueryOptions: (endpointId: string) => ({
		queryKey: ["endpoint-models", endpointId],
	}),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => ({
	...(await importOriginal<typeof import("@tanstack/react-router")>()),
	Link: ({
		children,
		to,
		...props
	}: React.ComponentProps<"a"> & { children?: React.ReactNode; to: string }) => (
		<a href={to} {...props}>
			{children}
		</a>
	),
}));

const { useQueriesMock } = vi.hoisted(() => ({ useQueriesMock: vi.fn() }));

vi.mock("@tanstack/react-query", async (importOriginal) => ({
	...(await importOriginal<typeof import("@tanstack/react-query")>()),
	useQueries: useQueriesMock,
}));

async function renderOpenedPicker() {
	const screen = await render(<ModelPicker selection={null} />);
	await screen.getByTestId("model-picker-trigger").click();
	await expect.element(screen.getByTestId("model-picker-menu")).toBeVisible();
	return screen;
}

describe("ModelPicker dropdown", () => {
	it("groups each endpoint's resolved models under that endpoint's name", async () => {
		useQueriesMock.mockReturnValue([
			{ data: ["llama3", "phi3"], isLoading: false, isError: false },
			{ data: ["gpt-4o"], isLoading: false, isError: false },
		]);

		const screen = await renderOpenedPicker();

		await expect.element(screen.getByTestId("model-group-e1")).toHaveTextContent("Local");
		await expect.element(screen.getByTestId("model-group-e2")).toHaveTextContent("Cloud");
		await expect.element(screen.getByTestId("model-item-e1-llama3")).toBeVisible();
		await expect.element(screen.getByTestId("model-item-e1-phi3")).toBeVisible();
		await expect.element(screen.getByTestId("model-item-e2-gpt-4o")).toBeVisible();
	});

	it("lists endpoint groups in the same order as the endpoints", async () => {
		useQueriesMock.mockReturnValue([
			{ data: ["llama3"], isLoading: false, isError: false },
			{ data: ["gpt-4o"], isLoading: false, isError: false },
		]);

		const screen = await renderOpenedPicker();

		const local = screen.getByTestId("model-group-e1").element();
		const cloud = screen.getByTestId("model-group-e2").element();
		expect(local.compareDocumentPosition(cloud) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it("drops endpoints with no models and points at the Library instead", async () => {
		useQueriesMock.mockReturnValue([{ data: [], isLoading: false, isError: false }]);

		const screen = await renderOpenedPicker();

		await expect
			.element(screen.getByTestId("model-picker-notice"))
			.toHaveTextContent("Browse the Library");
	});
});
