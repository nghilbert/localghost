import { describe, expect, it } from "vitest";
import {
	buildModelRows,
	matchesModelFacets,
} from "#/routes/_authenticated/library/-lib/model-rows";
import type { CatalogModel, PullProgress } from "#/shared/domain/model/types";
import { makeCatalogModel, makeInstalledModel } from "#/test/factories";

function rowById(rows: ReturnType<typeof buildModelRows>, id: string) {
	const row = rows.find((r) => r.id === id);
	if (!row) throw new Error(`no row for ${id}`);
	return row;
}

function catalogById(models: CatalogModel[]) {
	return new Map(models.map((model) => [model.id, model]));
}

describe("buildModelRows", () => {
	it("unions the catalog page, installed models, and active downloads without duplicates", () => {
		const catalogPage = [
			makeCatalogModel({ id: "org/llama3.2-GGUF:Q4_K_M" }),
			makeCatalogModel({ id: "org/qwen2.5-GGUF:Q4_K_M" }),
		];
		const installed = [makeInstalledModel({ id: "org/llama3.2-GGUF:Q4_K_M" })];
		const pulling: Record<string, PullProgress> = {
			"org/mistral-GGUF:Q4_K_M": { status: "Downloading…" },
		};

		const rows = buildModelRows({
			catalogPage,
			catalogById: catalogById(catalogPage),
			installedModels: installed,
			pulling,
			includeOffPageInstalled: true,
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
			catalogPage: [],
			catalogById: new Map(),
			installedModels: installed,
			pulling,
			includeOffPageInstalled: true,
		});

		expect(rows).toHaveLength(1);
		const row = rowById(rows, "org/llama3.2-GGUF:Q4_K_M");
		expect(row.installed).not.toBeNull();
		expect(row.pullState).toEqual({ status: "Downloading…" });
		expect(matchesModelFacets({ row, licenses: ["mit"], capabilities: [] })).toBe(false);
	});

	it("enriches an off-page installed model from the by-id lookup", () => {
		const offPageModel = makeCatalogModel({
			id: "org/llama3.2-GGUF:Q4_K_M",
			name: "org/llama3.2-GGUF",
			license: "mit",
			tags: ["code"],
		});
		const installed = [makeInstalledModel({ id: "org/llama3.2-GGUF:Q4_K_M" })];

		const rows = buildModelRows({
			catalogPage: [],
			catalogById: catalogById([offPageModel]),
			installedModels: installed,
			pulling: {},
			includeOffPageInstalled: true,
		});

		const row = rowById(rows, "org/llama3.2-GGUF:Q4_K_M");
		expect(row.catalog).toBe(offPageModel);
		expect(matchesModelFacets({ row, licenses: ["mit"], capabilities: ["code"] })).toBe(true);
	});

	it("excludes off-page installed models when includeOffPageInstalled is false", () => {
		const catalogPage = [makeCatalogModel({ id: "org/qwen2.5-GGUF:Q4_K_M" })];
		const installed = [makeInstalledModel({ id: "org/llama3.2-GGUF:Q4_K_M" })];

		const rows = buildModelRows({
			catalogPage,
			catalogById: catalogById(catalogPage),
			installedModels: installed,
			pulling: {},
			includeOffPageInstalled: false,
		});

		expect(rows.map((r) => r.id)).toEqual(["org/qwen2.5-GGUF:Q4_K_M"]);
	});

	it("always keeps an off-page download, even when installed models are excluded", () => {
		const catalogPage = [makeCatalogModel({ id: "org/qwen2.5-GGUF:Q4_K_M" })];
		const installed = [makeInstalledModel({ id: "org/llama3.2-GGUF:Q4_K_M" })];
		const pulling: Record<string, PullProgress> = {
			"org/mistral-GGUF:Q4_K_M": { status: "Downloading", completed: 37, total: 120 },
		};

		const rows = buildModelRows({
			catalogPage,
			catalogById: catalogById(catalogPage),
			installedModels: installed,
			pulling,
			includeOffPageInstalled: false,
		});

		expect(rows.map((r) => r.id).sort()).toEqual([
			"org/mistral-GGUF:Q4_K_M",
			"org/qwen2.5-GGUF:Q4_K_M",
		]);
		expect(rowById(rows, "org/mistral-GGUF:Q4_K_M").installed).toBeNull();
	});
});
