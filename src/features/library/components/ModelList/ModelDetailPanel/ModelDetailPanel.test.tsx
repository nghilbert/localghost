import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import type { ModelRow } from "#/features/library/lib/model-rows";
import type { PullProgress } from "#/features/library/library.types";
import { makeCatalogModel, makeHardware, makeInstalledModel } from "#/test/factories";
import { render, renderWithRouter } from "#/test/utils";
import { ModelDetailPanel } from ".";

const catalog = makeCatalogModel({
	id: "org/llama3.1-GGUF:Q4_K_M",
	name: "org/llama3.1-GGUF",
	paramB: 8,
	sizeGb: 4.9,
	contextK: 128,
	tags: ["tools", "chat"],
	capabilities: ["tools"],
	variants: [
		{ quant: "Q4_K_M", sizeGb: 4.9, fileName: "llama3.1-Q4_K_M.gguf", repoId: "org/llama3.1-GGUF" },
		{ quant: "Q70B", sizeGb: 43, fileName: "llama3.1-Q70B.gguf", repoId: "org/llama3.1-GGUF" },
		{ quant: "Q8_0", sizeGb: 8.5, fileName: "llama3.1-Q8_0.gguf", repoId: "org/llama3.1-GGUF" },
	],
});

const availableRow: ModelRow = {
	id: "org/llama3.1-GGUF:Q4_K_M",
	name: "org/llama3.1-GGUF",
	catalog,
	installed: null,
	pullState: undefined,
};

const INSTALLED_HINT = "This quantization is installed. Pick another to add it alongside.";

describe("ModelDetailPanel", () => {
	it("selects a searched variant and binds every pull action to its exact id", async () => {
		const onPull = vi.fn();
		const onStop = vi.fn();
		const renderPanel = ({ pulling }: { pulling: Record<string, PullProgress> }) => (
			<ModelDetailPanel
				row={availableRow}
				hardware={makeHardware({ freeRamGb: 16, gpus: null })}
				pulling={pulling}
				endpointId="endpoint-1"
				fetchedVariants={undefined}
				onPull={onPull}
				onStop={onStop}
				onDelete={vi.fn()}
			/>
		);
		const screen = await render(renderPanel({ pulling: {} }));

		await userEvent.click(screen.getByRole("button", { name: "Download" }));
		expect(onPull).toHaveBeenLastCalledWith("org/llama3.1-GGUF:Q4_K_M");

		await userEvent.fill(screen.getByRole("combobox", { name: "Variant" }), "q8_0");
		await userEvent.click(screen.getByRole("option").first());

		await expect.element(screen.getByText("org/llama3.1-GGUF:Q8_0")).toBeInTheDocument();
		await userEvent.click(screen.getByRole("button", { name: "Download" }));
		expect(onPull).toHaveBeenLastCalledWith("org/llama3.1-GGUF:Q8_0");

		await screen.rerender(
			renderPanel({
				pulling: {
					"org/llama3.1-GGUF:Q8_0": {
						status: "Downloading...",
						completed: 50,
						total: 100,
					},
				},
			}),
		);
		await expect.element(screen.getByText("50% · 50 / 100 B")).toBeInTheDocument();
		await userEvent.click(screen.getByRole("button", { name: /^Stop downloading/ }));
		expect(onStop).toHaveBeenCalledWith("org/llama3.1-GGUF:Q8_0");
	});

	it("links to the model's settings and shows variants for an installed row, with the installed quant unpullable", async () => {
		const installed = makeInstalledModel({ id: "org/llama3.1-GGUF:Q4_K_M" });
		const installedRow: ModelRow = { ...availableRow, installed };
		const onDelete = vi.fn();
		const onPull = vi.fn();

		const screen = await renderWithRouter(
			<ModelDetailPanel
				row={installedRow}
				hardware={undefined}
				pulling={{}}
				endpointId="endpoint-1"
				fetchedVariants={undefined}
				onPull={onPull}
				onStop={vi.fn()}
				onDelete={onDelete}
			/>,
		);

		const settingsLink = screen.getByRole("link", { name: "Model settings" });
		await expect
			.element(settingsLink)
			.toHaveAttribute("href", expect.stringContaining("/settings/models"));
		const href = new URL(settingsLink.element().getAttribute("href") ?? "", "http://localhost");
		expect(Object.fromEntries(href.searchParams)).toEqual({
			endpointId: "endpoint-1",
			model: "org/llama3.1-GGUF:Q4_K_M",
		});
		await userEvent.click(screen.getByRole("button", { name: "Delete model" }));
		expect(onDelete).toHaveBeenCalledWith("org/llama3.1-GGUF:Q4_K_M");

		await expect.element(screen.getByText(INSTALLED_HINT)).toBeInTheDocument();
		await expect.element(screen.getByRole("button", { name: "Download" })).not.toBeInTheDocument();

		await userEvent.fill(screen.getByRole("combobox", { name: "Variant" }), "q8_0");
		await userEvent.click(screen.getByRole("option").first());
		await expect.element(screen.getByText(INSTALLED_HINT)).not.toBeInTheDocument();
		await userEvent.click(screen.getByRole("button", { name: "Download" }));
		expect(onPull).toHaveBeenCalledWith("org/llama3.1-GGUF:Q8_0");
	});
});
