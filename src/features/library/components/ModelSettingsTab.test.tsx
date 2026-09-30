import { beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "#/test/utils";
import { ModelSettingsTab } from "./ModelSettingsTab";

const LOCAL_ID = "0197c3a0-0000-7000-8000-000000000001";

const { fetchModelSettings, resetMutate } = vi.hoisted(() => ({
	fetchModelSettings: vi.fn(),
	resetMutate: vi.fn(),
}));

vi.mock("#/features/library/library.queries", () => ({
	libraryQueries: {
		runtimeStatus: () => ({
			queryKey: ["runtime-status"],
			queryFn: () => ({
				found: true,
				endpointId: LOCAL_ID,
				installedModels: [{ id: "gemma:Q4_K_M" }, { id: "qwen:Q8_0" }],
			}),
		}),
		modelSettings: {
			list: () => ({ queryKey: ["model-settings"], queryFn: () => fetchModelSettings() }),
		},
	},
}));

vi.mock("#/features/endpoint/endpoint.queries", () => ({
	endpointQueries: {
		list: () => ({ queryKey: ["endpoints"], queryFn: () => [{ id: LOCAL_ID, name: "llama.cpp" }] }),
		models: () => ({ queryKey: ["endpoint-models"], queryFn: () => [] }),
	},
}));

vi.mock("#/features/library/hooks/use-reset-model-setting", () => ({
	useResetModelSetting: () => ({ mutate: resetMutate, isPending: false }),
}));

vi.mock("./ModelSettingsForm", () => ({
	ModelSettingsForm: ({ model }: { model: string }) => <p>Overrides form for {model}</p>,
}));

beforeEach(() => {
	vi.clearAllMocks();
	fetchModelSettings.mockResolvedValue([]);
});

describe("ModelSettingsTab", () => {
	it("picks a model from the endpoint groups", async () => {
		const onSelectionChange = vi.fn();
		const screen = await render(
			<ModelSettingsTab selection={undefined} onSelectionChange={onSelectionChange} />,
		);

		await screen.getByRole("combobox", { name: "Model" }).click();
		await screen.getByRole("option", { name: "qwen:Q8_0" }).click();

		expect(onSelectionChange).toHaveBeenCalledWith({ endpointId: LOCAL_ID, model: "qwen:Q8_0" });
	});

	it("shows the overrides form for the selected model", async () => {
		const screen = await render(
			<ModelSettingsTab
				selection={{ endpointId: LOCAL_ID, model: "gemma:Q4_K_M" }}
				onSelectionChange={vi.fn()}
			/>,
		);

		await expect.element(screen.getByText("Overrides form for gemma:Q4_K_M")).toBeVisible();
	});

	it("lists saved overrides, with edit and reset", async () => {
		fetchModelSettings.mockResolvedValue([
			{
				endpointId: LOCAL_ID,
				endpointName: "llama.cpp",
				model: "gemma:Q4_K_M",
				options: { temperature: 0.3, top_p: undefined },
			},
		]);
		const onSelectionChange = vi.fn();
		const screen = await render(
			<ModelSettingsTab selection={undefined} onSelectionChange={onSelectionChange} />,
		);

		await expect.element(screen.getByText("llama.cpp · temperature 0.3")).toBeVisible();
		await userEvent.click(screen.getByRole("button", { name: "Edit" }));
		expect(onSelectionChange).toHaveBeenCalledWith({ endpointId: LOCAL_ID, model: "gemma:Q4_K_M" });
		await userEvent.click(screen.getByRole("button", { name: "Reset" }));
		expect(resetMutate).toHaveBeenCalledWith({ endpointId: LOCAL_ID, model: "gemma:Q4_K_M" });
	});

	it("says so when no model has overrides", async () => {
		const screen = await render(
			<ModelSettingsTab selection={undefined} onSelectionChange={vi.fn()} />,
		);

		await expect.element(screen.getByText("No overrides yet")).toBeVisible();
	});
});
