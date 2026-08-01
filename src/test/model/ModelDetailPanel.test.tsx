import { describe, expect, it, vi } from "vitest";
import { ModelDetailPanel } from "#/routes/_authenticated/library/-components/ModelList/ModelDetailPanel";
import type { ModelRow } from "#/routes/_authenticated/library/-lib/model-rows";
import type { PullProgress } from "#/shared/domain/model/types";
import { makeCatalogModel, makeHardware, makeInstalledModel } from "#/test/factories";
import { render } from "#/test/utils";

vi.mock("#/routes/_authenticated/library/-components/ModelList/ModelSettingsForm", () => ({
	ModelSettingsForm: ({ model }: { model: string }) => (
		<div data-testid="model-settings-form">{model}</div>
	),
}));

vi.mock("#/shared/domain/model-setting/model-setting.functions", () => ({
	modelSettingQueryOptions: ({ endpointId, model }: { endpointId: string; model: string }) => ({
		queryKey: ["model-setting", endpointId, model],
	}),
	resetModelSetting: vi.fn(),
	saveModelSetting: vi.fn(),
}));

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

		await expect
			.element(screen.getByTestId("model-variant-target"))
			.toHaveTextContent("org/llama3.1-GGUF:Q4_K_M");

		await screen.getByTestId("model-variant-combobox").fill("q8_0");
		await screen.getByTestId("model-variant-option").first().click();

		await expect
			.element(screen.getByTestId("model-variant-target"))
			.toHaveTextContent("org/llama3.1-GGUF:Q8_0");
		await screen.getByTestId("model-pull-button").click();
		expect(onPull).toHaveBeenLastCalledWith("org/llama3.1-GGUF:Q8_0");

		await screen.rerender(
			renderPanel({
				pulling: {
					"org/llama3.1-GGUF:Q8_0": {
						status: "Downloading…",
						completed: 50,
						total: 100,
					},
				},
			}),
		);
		await expect
			.element(screen.getByTestId("model-pull-progress"))
			.toHaveTextContent("50% · 50 B / 100 B");
		await screen.getByTestId("model-pull-stop").click();
		expect(onStop).toHaveBeenCalledWith("org/llama3.1-GGUF:Q8_0");
	});

	it("shows settings and variants for an installed row, with the installed quant unpullable", async () => {
		const installed = makeInstalledModel({ id: "org/llama3.1-GGUF:Q4_K_M" });
		const installedRow: ModelRow = { ...availableRow, installed };
		const onDelete = vi.fn();
		const onPull = vi.fn();

		const screen = await render(
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

		await expect
			.element(screen.getByTestId("model-settings-form"))
			.toHaveTextContent("org/llama3.1-GGUF:Q4_K_M");
		await screen.getByTestId("model-delete-button").click();
		expect(onDelete).toHaveBeenCalledWith("org/llama3.1-GGUF:Q4_K_M");

		await expect
			.element(screen.getByTestId("model-variant-target"))
			.toHaveTextContent("org/llama3.1-GGUF:Q4_K_M");
		await expect.element(screen.getByTestId("model-pull-button")).not.toBeInTheDocument();
		await expect.element(screen.getByTestId("model-variant-installed-hint")).toBeInTheDocument();

		await screen.getByTestId("model-variant-combobox").fill("q8_0");
		await screen.getByTestId("model-variant-option").first().click();
		await expect
			.element(screen.getByTestId("model-variant-installed-hint"))
			.not.toBeInTheDocument();
		await expect.element(screen.getByTestId("model-pull-button")).toBeInTheDocument();
		await screen.getByTestId("model-pull-button").click();
		expect(onPull).toHaveBeenCalledWith("org/llama3.1-GGUF:Q8_0");
	});
});
