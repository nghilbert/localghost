import type { ComponentProps, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "#/test/utils";

const endpoints = [
	{ id: "e1", name: "Local" },
	{ id: "e2", name: "Cloud" },
];

type RuntimeStatus = {
	found: boolean;
	endpointId: string;
	installedModels: { id: string }[];
};

const { fetchEndpointModels, fetchLibraryStatus } = vi.hoisted(() => ({
	fetchEndpointModels: vi.fn(),
	fetchLibraryStatus: vi.fn(),
}));

vi.mock("#/features/library/library.queries", () => ({
	libraryQueries: {
		runtimeStatus: () => ({
			queryKey: ["library-status"],
			queryFn: () => fetchLibraryStatus(),
		}),
	},
}));

vi.mock("#/features/endpoint/endpoint.queries", () => ({
	endpointQueries: {
		list: () => ({ queryKey: ["endpoints"], queryFn: () => endpoints }),
		models: (endpointId: string) => ({
			queryKey: ["endpoint-models", endpointId],
			queryFn: () => fetchEndpointModels(endpointId),
		}),
	},
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

const { ModelPicker } = await import("./ModelPicker");

/** No llama.cpp runtime found, so every endpoint falls through to its own probe. */
function noRuntime(): RuntimeStatus {
	return { found: false, endpointId: "", installedModels: [] };
}

async function renderOpenedPicker() {
	const screen = await render(<ModelPicker selection={null} />);
	await screen.getByRole("button", { name: "Select model" }).click();
	await expect.element(screen.getByRole("menu")).toBeVisible();
	return screen;
}

beforeEach(() => {
	vi.clearAllMocks();
	fetchLibraryStatus.mockResolvedValue(noRuntime());
	fetchEndpointModels.mockResolvedValue([]);
});

describe("ModelPicker dropdown", () => {
	it("groups each endpoint's resolved models under that endpoint's name", async () => {
		fetchEndpointModels.mockImplementation((id: string) =>
			id === "e1" ? ["llama3", "phi3"] : ["gpt-4o"],
		);

		const screen = await renderOpenedPicker();

		await expect.element(screen.getByRole("group", { name: "Local" })).toBeInTheDocument();
		await expect.element(screen.getByRole("group", { name: "Cloud" })).toBeInTheDocument();
		await expect.element(screen.getByRole("menuitem", { name: "llama3" })).toBeVisible();
		await expect.element(screen.getByRole("menuitem", { name: "phi3" })).toBeVisible();
		await expect.element(screen.getByRole("menuitem", { name: "gpt-4o" })).toBeVisible();
	});

	it("lists endpoint groups in the same order as the endpoints", async () => {
		fetchEndpointModels.mockImplementation((id: string) => (id === "e1" ? ["llama3"] : ["gpt-4o"]));

		const screen = await renderOpenedPicker();

		const local = screen.getByRole("group", { name: "Local" }).element();
		const cloud = screen.getByRole("group", { name: "Cloud" }).element();
		expect(local.compareDocumentPosition(cloud) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it("drops endpoints with no models and points at the Library instead", async () => {
		const screen = await renderOpenedPicker();

		await expect.element(screen.getByText("Browse the Library")).toBeVisible();
	});

	it("reads the local llama.cpp endpoint's models from live runtime status, never its own probe", async () => {
		fetchLibraryStatus.mockResolvedValue({
			found: true,
			endpointId: "e1",
			installedModels: [{ id: "just-downloaded:Q4_K_M" }],
		});
		fetchEndpointModels.mockResolvedValue(["gpt-4o"]);

		const screen = await renderOpenedPicker();

		await expect
			.element(screen.getByRole("menuitem", { name: "just-downloaded:Q4_K_M" }))
			.toBeVisible();
		await expect.element(screen.getByRole("menuitem", { name: "gpt-4o" })).toBeVisible();
		expect(fetchEndpointModels).not.toHaveBeenCalledWith("e1");
		expect(fetchEndpointModels).toHaveBeenCalledWith("e2");
	});
});
