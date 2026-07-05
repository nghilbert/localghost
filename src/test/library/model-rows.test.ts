import { describe, expect, it } from "vitest";
import { buildModelRows } from "#/features/library/lib/model-rows";
import type { PullProgress } from "#/features/library/lib/types";
import { makeCatalogModel, makeInstalledModel } from "#/test/factories";

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
		});

		expect(rows).toHaveLength(1);
		const row = rowById(rows, "llama3.2:3b");
		expect(row.installed).not.toBeNull();
		expect(row.pullState).toEqual({ status: "verifying" });
	});
});
