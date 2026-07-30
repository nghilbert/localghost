import type { ComponentProps, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ModelPicker } from "#/routes/_authenticated/-components/chat/ChatInput/ModelPicker";
import { render } from "#/test/utils";

const endpoints = [
	{ id: "e1", name: "Local" },
	{ id: "e2", name: "Cloud" },
];

vi.mock("#/shared/domain/endpoint/use-endpoints", () => ({
	useEndpoints: () => ({ endpoints }),
}));

// The RPC boundary: mocking it keeps browser tests off the server-only import graph.
vi.mock("#/shared/domain/endpoint/endpoint.functions", () => ({
	endpointModelsQueryOptions: (endpointId: string) => ({
		queryKey: ["endpoint-models", endpointId],
	}),
}));

vi.mock("#/shared/domain/model/model.functions", () => ({
	libraryStatusQueryOptions: () => ({ queryKey: ["library-status"] }),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => ({
	...(await importOriginal<typeof import("@tanstack/react-router")>()),
	Link: ({
		children,
		to,
		...props
	}: ComponentProps<"a"> & { children?: ReactNode; to: string }) => (
		<a href={to} {...props}>
			{children}
		</a>
	),
}));

type RuntimeStatusFixture = {
	found: boolean;
	endpointId: string;
	installedModels: { id: string }[];
};

const { useQueriesMock, useQueryMock } = vi.hoisted(() => ({
	useQueriesMock: vi.fn(),
	// No runtime found by default: every endpoint is probed via useQueries, matching
	// this suite's existing fixtures. The llama.cpp-runtime-status test overrides this.
	useQueryMock: vi.fn<() => { data: RuntimeStatusFixture | undefined; isPending: boolean }>(() => ({
		data: undefined,
		isPending: false,
	})),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => ({
	...(await importOriginal<typeof import("@tanstack/react-query")>()),
	useQueries: useQueriesMock,
	useQuery: useQueryMock,
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

	it("reads the local llama.cpp endpoint's models from live runtime status, not a stale probe", async () => {
		// Regression: the picker used to probe every endpoint's /models independently,
		// so a model just deleted or downloaded in the Library kept showing the old
		// list until that separate query's own cache expired.
		useQueryMock.mockReturnValue({
			data: {
				found: true,
				endpointId: "e1",
				installedModels: [{ id: "just-downloaded:Q4_K_M" }],
			},
			isPending: false,
		});
		// Only "e2" (Cloud) is still probed via useQueries; "e1" comes from runtime status.
		useQueriesMock.mockReturnValue([{ data: ["gpt-4o"], isLoading: false, isError: false }]);

		const screen = await renderOpenedPicker();

		await expect.element(screen.getByTestId("model-item-e1-just-downloaded:Q4_K_M")).toBeVisible();
		await expect.element(screen.getByTestId("model-item-e2-gpt-4o")).toBeVisible();
	});
});
