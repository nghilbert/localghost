import { describe, expect, it } from "vitest";
import { buildModelRows } from "#/routes/_authenticated/library/-lib/model-rows";
import type { PullProgress } from "#/shared/domain/model/types";
import { makeCatalogModel, makeInstalledModel } from "#/test/factories";

function rowById(rows: ReturnType<typeof buildModelRows>, id: string) {
	const row = rows.find((r) => r.id === id);
	if (!row) throw new Error(`no row for ${id}`);
	return row;
}

describe("buildModelRows", () => {
	it("unions catalog, installed models, and active downloads without duplicates", () => {
		const catalog = [
			makeCatalogModel({ id: "org/llama3.2-GGUF:Q4_K_M" }),
			makeCatalogModel({ id: "org/qwen2.5-GGUF:Q4_K_M" }),
		];
		const installed = [makeInstalledModel({ id: "org/llama3.2-GGUF:Q4_K_M" })];
		const pulling: Record<string, PullProgress> = {
			"org/mistral-GGUF:Q4_K_M": { status: "Downloading…" },
		};

		const rows = buildModelRows({
			catalog,
			installedModels: installed,
			pulling,
		});

		expect(rows.map((r) => r.id).sort()).toEqual([
			"org/llama3.2-GGUF:Q4_K_M",
			"org/mistral-GGUF:Q4_K_M",
			"org/qwen2.5-GGUF:Q4_K_M",
		]);
	});

	it("marks a model both installed and downloading on a single row", () => {
		const installed = [makeInstalledModel({ id: "org/llama3.2-GGUF:Q4_K_M" })];
		const pulling: Record<string, PullProgress> = {
			"org/llama3.2-GGUF:Q4_K_M": { status: "Downloading…" },
		};

		const rows = buildModelRows({
			catalog: [],
			installedModels: installed,
			pulling,
		});

		expect(rows).toHaveLength(1);
		const row = rowById(rows, "org/llama3.2-GGUF:Q4_K_M");
		expect(row.installed).not.toBeNull();
		expect(row.pullState).toEqual({ status: "Downloading…" });
	});
});
