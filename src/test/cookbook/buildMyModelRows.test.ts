import { describe, expect, it } from "vitest";
import { buildMyModelRows } from "#/features/cookbook/components/MyModelTable";
import type { CatalogModel, PullProgress } from "#/features/cookbook/lib/types";
import { makeCatalogModel, makeGpu, makeHardware, makeInstalledModel } from "#/test/factories";

const catalogMap = (models: CatalogModel[]) => new Map(models.map((m) => [m.id, m]));

function only<T>(rows: T[]): T {
	expect(rows).toHaveLength(1);
	const [row] = rows;
	if (!row) throw new Error("expected exactly one row");
	return row;
}

describe("buildMyModelRows", () => {
	it("includes every installed model and every active pull", () => {
		const installed = [
			makeInstalledModel({ name: "llama3.2:3b" }),
			makeInstalledModel({ name: "mistral:7b" }),
		];
		const pulling: Record<string, PullProgress> = { "qwen2.5:7b": { status: "pulling" } };

		const rows = buildMyModelRows(installed, pulling, new Map(), undefined);

		expect(rows.map((r) => r.id).sort()).toEqual(["llama3.2:3b", "mistral:7b", "qwen2.5:7b"]);
	});

	it("does not duplicate a model that is both installed and pulling", () => {
		const installed = [makeInstalledModel({ name: "llama3.2:3b" })];
		const pulling: Record<string, PullProgress> = { "llama3.2:3b": { status: "verifying" } };

		const row = only(buildMyModelRows(installed, pulling, new Map(), undefined));

		expect(row.installed).not.toBeNull();
		expect(row.pullState).toEqual({ status: "verifying" });
	});

	it("enriches matched ids with catalog metadata and a fit score", () => {
		const catalog = makeCatalogModel({ id: "llama3.2:3b", name: "Llama 3.2", vramGb: 4 });
		const installed = [makeInstalledModel({ name: "llama3.2:3b" })];
		const hardware = makeHardware({ gpus: [makeGpu({ totalVramMb: 8192 })] });

		const row = only(buildMyModelRows(installed, {}, catalogMap([catalog]), hardware));

		expect(row.name).toBe("Llama 3.2");
		expect(row.catalog).toBe(catalog);
		expect(row.fit?.tier).toBe("gpu-optimal");
	});

	it("passes off-catalog installs through with the id as the name and no fit", () => {
		const installed = [makeInstalledModel({ name: "custom-finetune:latest" })];
		const hardware = makeHardware({ gpus: [makeGpu()] });

		const row = only(buildMyModelRows(installed, {}, new Map(), hardware));

		expect(row.name).toBe("custom-finetune:latest");
		expect(row.catalog).toBeNull();
		expect(row.fit).toBeNull();
	});

	it("leaves fit null when hardware is unavailable even for catalog models", () => {
		const catalog = makeCatalogModel({ id: "llama3.2:3b" });
		const installed = [makeInstalledModel({ name: "llama3.2:3b" })];

		const row = only(buildMyModelRows(installed, {}, catalogMap([catalog]), undefined));

		expect(row.catalog).toBe(catalog);
		expect(row.fit).toBeNull();
	});
});
