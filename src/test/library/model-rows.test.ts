import { describe, expect, it } from "vitest";
import { buildModelRows } from "#/features/library/lib/model-rows";
import type { PullProgress } from "#/features/library/lib/types";
import { makeCatalogModel, makeGpu, makeHardware, makeInstalledModel } from "#/test/factories";

function rowById(rows: ReturnType<typeof buildModelRows>, id: string) {
	const row = rows.find((r) => r.id === id);
	if (!row) throw new Error(`no row for ${id}`);
	return row;
}

describe("buildModelRows", () => {
	it("unions catalog, installed models, and active pulls without duplicates", () => {
		const catalog = [
			makeCatalogModel({ id: "llama3.2:3b" }),
			makeCatalogModel({ id: "qwen2.5:7b" }),
		];
		const installed = [makeInstalledModel({ name: "llama3.2:3b" })];
		const pulling: Record<string, PullProgress> = { "mistral:7b": { status: "pulling" } };

		const rows = buildModelRows({
			catalog,
			installedModels: installed,
			pulling,
			hardware: undefined,
		});

		expect(rows.map((r) => r.id).sort()).toEqual(["llama3.2:3b", "mistral:7b", "qwen2.5:7b"]);
	});

	it("marks a model both installed and pulling on a single row", () => {
		const installed = [makeInstalledModel({ name: "llama3.2:3b" })];
		const pulling: Record<string, PullProgress> = { "llama3.2:3b": { status: "verifying" } };

		const rows = buildModelRows({
			catalog: [],
			installedModels: installed,
			pulling,
			hardware: undefined,
		});

		expect(rows).toHaveLength(1);
		const row = rowById(rows, "llama3.2:3b");
		expect(row.installed).not.toBeNull();
		expect(row.pullState).toEqual({ status: "verifying" });
	});

	it("scores catalog rows against hardware", () => {
		const catalog = [makeCatalogModel({ id: "llama3.2:3b", name: "Llama 3.2", vramGb: 4 })];
		const hardware = makeHardware({ gpus: [makeGpu({ totalVramMb: 8192 })] });

		const row = rowById(
			buildModelRows({ catalog, installedModels: [], pulling: {}, hardware }),
			"llama3.2:3b",
		);
		expect(row.name).toBe("Llama 3.2");
		expect(row.fit?.tier).toBe("gpu-optimal");
	});

	it("passes off-catalog installs through with the id as name and no fit", () => {
		const installed = [makeInstalledModel({ name: "custom-finetune:latest" })];
		const hardware = makeHardware({ gpus: [makeGpu()] });

		const row = rowById(
			buildModelRows({ catalog: [], installedModels: installed, pulling: {}, hardware }),
			"custom-finetune",
		);
		expect(row.name).toBe("custom-finetune");
		expect(row.catalog).toBeNull();
		expect(row.fit).toBeNull();
	});

	it("leaves fit null when a catalog model has an unknown parameter count", () => {
		const catalog = [makeCatalogModel({ id: "nomic-embed-text", paramB: null, vramGb: 0 })];
		const hardware = makeHardware({ gpus: [makeGpu({ totalVramMb: 8192 })] });

		const row = rowById(
			buildModelRows({ catalog, installedModels: [], pulling: {}, hardware }),
			"nomic-embed-text",
		);
		expect(row.fit).toBeNull();
	});
});
