import { describe, expect, it, vi } from "vitest";
import { ModelDetailPanel } from "#/routes/_authenticated/library/-components/ModelTable/ModelDetailPanel";
import type { ModelRow } from "#/routes/_authenticated/library/-lib/model-rows";
import type { PullProgress } from "#/shared/domain/model/types";
import { makeCatalogModel, makeHardware, makeInstalledModel } from "#/test/factories";
import { render } from "#/test/utils";

vi.mock("#/routes/_authenticated/library/-components/ModelTable/ModelSettingsForm", () => ({
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
	id: "llama3.1:8b",
	name: "llama3.1",
	paramB: 8,
	sizeGb: 4.9,
	contextK: 128,
	tags: ["tools", "chat"],
	capabilities: ["tools"],
	variants: [
		{ tag: "latest", digest: "same", sizeGb: 4.9, contextK: 128 },
		{ tag: "70b", digest: "large", sizeGb: 43, contextK: 128 },
		{ tag: "8b", digest: "same", sizeGb: 4.9, contextK: 128 },
		{ tag: "8b-q8_0", digest: "q8", sizeGb: 8.5, contextK: 128 },
	],
});

const availableRow: ModelRow = {
	id: "llama3.1:8b",
	name: "llama3.1",
	catalog,
	installed: null,
	pullState: undefined,
};

describe("ModelDetailPanel", () => {
	it("selects a searched variant and binds every pull action to its exact id", async () => {
		const onPull = vi.fn();
		const onStop = vi.fn();
		const onDismiss = vi.fn();
		const renderPanel = ({ pulling }: { pulling: Record<string, PullProgress> }) => (
			<ModelDetailPanel
				row={availableRow}
				hardware={makeHardware({ freeRamGb: 16, gpus: null })}
				pulling={pulling}
				endpointId="endpoint-1"
				onPull={onPull}
				onStop={onStop}
				onDismiss={onDismiss}
				onDelete={vi.fn()}
			/>
		);
		const screen = await render(renderPanel({ pulling: {} }));

		await expect
			.element(screen.getByTestId("model-variant-target"))
			.toHaveTextContent("llama3.1:8b");

		await screen.getByTestId("model-variant-combobox").fill("q8_0");
		await screen.getByTestId("model-variant-option").first().click();

		await expect
			.element(screen.getByTestId("model-variant-target"))
			.toHaveTextContent("llama3.1:8b-q8_0");
		await screen.getByTestId("model-pull-button").click();
		expect(onPull).toHaveBeenLastCalledWith("llama3.1:8b-q8_0");

		await screen.rerender(
			renderPanel({ pulling: { "llama3.1:8b-q8_0": { status: "pulling layers" } } }),
		);
		await expect.element(screen.getByTestId("model-pull-progress")).toBeInTheDocument();
		await screen.getByTestId("model-pull-stop").click();
		expect(onStop).toHaveBeenCalledWith("llama3.1:8b-q8_0");

		await screen.rerender(
			renderPanel({
				pulling: { "llama3.1:8b-q8_0": { status: "failed", error: "disk full" } },
			}),
		);
		await expect.element(screen.getByTestId("model-pull-error")).toBeInTheDocument();
		await screen.getByTestId("model-pull-retry").click();
		await screen.getByTestId("model-pull-dismiss").click();
		expect(onPull).toHaveBeenLastCalledWith("llama3.1:8b-q8_0");
		expect(onDismiss).toHaveBeenCalledWith("llama3.1:8b-q8_0");
	});

	it("hides variant selection and keeps settings and deletion on the installed id", async () => {
		const installed = makeInstalledModel({ name: "llama3.1:8b" });
		const installedRow: ModelRow = { ...availableRow, installed };
		const onDelete = vi.fn();

		const screen = await render(
			<ModelDetailPanel
				row={installedRow}
				hardware={undefined}
				pulling={{}}
				endpointId="endpoint-1"
				onPull={vi.fn()}
				onStop={vi.fn()}
				onDismiss={vi.fn()}
				onDelete={onDelete}
			/>,
		);

		await expect.element(screen.getByTestId("model-variant-combobox")).not.toBeInTheDocument();
		await expect
			.element(screen.getByTestId("model-settings-form"))
			.toHaveTextContent("llama3.1:8b");
		await screen.getByTestId("model-delete-button").click();
		expect(onDelete).toHaveBeenCalledWith("llama3.1:8b");
	});
});
