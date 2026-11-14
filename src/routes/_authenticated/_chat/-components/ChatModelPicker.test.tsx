import type { ComponentProps, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ModelSelection } from "#/lib/llm-schemas";
import { render } from "#/test/utils";

const endpoints = [
	{ id: "e1", name: "Local" },
	{ id: "e2", name: "Cloud" },
];

interface RuntimeStatus {
	found: boolean;
	endpointId: string;
	installedModels: Array<{ id: string }>;
}

const { fetchEndpointModels, fetchLibraryStatus } = vi.hoisted(() => ({
	fetchEndpointModels: vi.fn<(endpointId: string) => string[] | Promise<string[]>>(),
	fetchLibraryStatus: vi.fn<() => Promise<RuntimeStatus>>(),
}));

vi.mock("#/features/library/library.queries", () => ({
	libraryQueries: {
		runtimeStatus: () => ({
			queryKey: ["library-status"],
			queryFn: () => fetchLibraryStatus(),
		}),
	},
}));

vi.mock("#/lib/endpoint/endpoint.queries", () => ({
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

const { ChatModelPicker } = await import("./ChatModelPicker");

/** No llama.cpp runtime found, so every endpoint falls through to its own probe. */
function noRuntime(): RuntimeStatus {
	return { found: false, endpointId: "", installedModels: [] };
}

async function renderOpenedPicker(onSelect?: (selection: ModelSelection) => void) {
	const screen = await render(<ChatModelPicker selection={null} onSelect={onSelect} />);
	const trigger = screen.getByRole("combobox", { name: "Model" });
	await expect.element(trigger).toHaveTextContent("Select model");
	await trigger.click();
	await expect.element(screen.getByRole("dialog")).toBeVisible();
	return screen;
}

beforeEach(() => {
	vi.clearAllMocks();
	fetchLibraryStatus.mockResolvedValue(noRuntime());
	fetchEndpointModels.mockResolvedValue([]);
});

describe("ChatModelPicker dropdown", () => {
	it("groups each endpoint's resolved models under that endpoint's name", async () => {
		fetchEndpointModels.mockImplementation((id: string) =>
			id === "e1" ? ["llama3", "phi3"] : ["gpt-4o"],
		);

		const screen = await renderOpenedPicker();

		await expect.element(screen.getByRole("group", { name: "Local" })).toBeInTheDocument();
		await expect.element(screen.getByRole("group", { name: "Cloud" })).toBeInTheDocument();
		await expect.element(screen.getByRole("option", { name: "llama3" })).toBeVisible();
		await expect.element(screen.getByRole("option", { name: "phi3" })).toBeVisible();
		await expect.element(screen.getByRole("option", { name: "gpt-4o" })).toBeVisible();
	});

	it("lists endpoint groups in the same order as the endpoints", async () => {
		fetchEndpointModels.mockImplementation((id: string) => [id === "e1" ? "llama3" : "gpt-4o"]);

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
			.element(screen.getByRole("option", { name: "just-downloaded:Q4_K_M" }))
			.toBeVisible();
		await expect.element(screen.getByRole("option", { name: "gpt-4o" })).toBeVisible();
		expect(fetchEndpointModels).not.toHaveBeenCalledWith("e1");
		expect(fetchEndpointModels).toHaveBeenCalledWith("e2");
	});
});

describe("ChatModelPicker search", () => {
	it("narrows the list to models matching the typed text", async () => {
		fetchEndpointModels.mockImplementation((id: string) =>
			id === "e1" ? ["llama3", "phi3"] : ["gpt-4o"],
		);

		const screen = await renderOpenedPicker();
		await screen.getByRole("combobox", { name: "Search models" }).fill("phi");

		await expect.element(screen.getByRole("option", { name: "phi3" })).toBeVisible();
		await expect.element(screen.getByRole("option", { name: "llama3" })).not.toBeInTheDocument();
		await expect.element(screen.getByRole("option", { name: "gpt-4o" })).not.toBeInTheDocument();
	});

	it("says so when nothing matches", async () => {
		fetchEndpointModels.mockResolvedValue(["llama3"]);

		const screen = await renderOpenedPicker();
		await screen.getByRole("combobox", { name: "Search models" }).fill("zzz");

		await expect.element(screen.getByText("No matching models")).toBeVisible();
	});

	it("reports the picked model with its endpoint", async () => {
		fetchEndpointModels.mockImplementation((id: string) => [id === "e1" ? "llama3" : "gpt-4o"]);
		const onSelect = vi.fn<(selection: ModelSelection) => void>();

		const screen = await renderOpenedPicker(onSelect);
		await screen.getByRole("option", { name: "gpt-4o" }).click();

		expect(onSelect).toHaveBeenCalledWith({ endpointId: "e2", model: "gpt-4o" });
	});
});

describe("ChatModelPicker layout", () => {
	it("shrinks a long model name so the buttons beside it stay in the row", async () => {
		const longName =
			"unsloth/Qwen3.5-35B-A3B-Instruct-2607-GGUF:UD-Q4_K_XL-with-a-very-long-suffix";
		const screen = await render(
			<div data-testid="row" style={{ display: "flex", width: 280 }}>
				<ChatModelPicker selection={{ endpointId: "e1", model: longName }} />
				<button type="button">Send</button>
			</div>,
		);

		const row = screen.getByTestId("row").element().getBoundingClientRect();
		const send = screen.getByRole("button", { name: "Send" }).element().getBoundingClientRect();
		expect(send.right).toBeLessThanOrEqual(row.right);
		await expect
			.element(screen.getByRole("combobox", { name: "Model" }))
			.toHaveTextContent(longName);
	});

	it("widens the panel past the button for long names, but never past the screen", async () => {
		const longName = "unsloth/Qwen3.5-35B-A3B-Instruct-2607-GGUF:UD-Q4_K_XL";
		fetchEndpointModels.mockImplementation((id: string) => (id === "e1" ? [longName] : []));

		const screen = await renderOpenedPicker();
		await expect.element(screen.getByRole("option", { name: longName })).toBeVisible();

		const trigger = screen
			.getByRole("combobox", { name: "Model" })
			.element()
			.getBoundingClientRect();
		const panel = screen.getByRole("dialog").element().getBoundingClientRect();
		expect(panel.width).toBeGreaterThan(trigger.width);
		expect(panel.right).toBeLessThanOrEqual(window.innerWidth);
	});
});
