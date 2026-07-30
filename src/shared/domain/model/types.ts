export type GpuVendor = "nvidia" | "amd";

export type GpuInfo = {
	name: string;
	vendor: GpuVendor;
	totalVramMb: number;
	freeVramMb: number;
};

export type HardwareInfo = {
	totalRamGb: number;
	freeRamGb: number;
	cpuModel: string;
	cpuCount: number;
	gpus: GpuInfo[] | null;
};

export type InstalledModel = {
	/** The router model id, `"{repo}:{QUANT}"`, as accepted by `POST /models`. */
	id: string;
	/** From the matching catalog entry when found; the router doesn't report file size. */
	sizeBytes: number | null;
	/** Parsed from the id's `:QUANT` suffix, e.g. "Q4_K_M". */
	quant: string | null;
	/** Billions of parameters parsed from the id, when derivable. */
	paramB: number | null;
	status: "loaded" | "loading" | "unloaded" | "sleeping";
	vision: boolean;
};

export type RuntimeStatus =
	| {
			found: true;
			runtimeUrl: string;
			installedModels: InstalledModel[];
			downloads: Record<string, PullProgress>;
			/** The discovered llama.cpp endpoint's id, for per-model settings scoping. */
			endpointId: string;
	  }
	| {
			found: false;
			runtimeUrl: null;
			installedModels: InstalledModel[];
			downloads: Record<string, PullProgress>;
			endpointId: null;
	  };

export type CatalogModel = {
	/** `"{repo}:{QUANT}"`: the row's default variant exactly as `POST /models` takes it. */
	id: string;
	/** The Hugging Face repo id, e.g. "ggml-org/gemma-3-4b-it-GGUF". */
	name: string;
	/** A human-readable name derived from the repo id, e.g. "Gemma 3 4B". */
	displayName: string;
	/** Billions of parameters, from the repo's `gguf.total` metadata when available, else parsed from the repo id. */
	paramB: number | null;
	/** Exact GGUF file size in GB (the default quant's), from the repo's file listing. */
	sizeGb: number | null;
	/** Context window in K tokens, from the repo's `gguf.context_length` metadata. */
	contextK: number | null;
	/** Display tags: capability badges plus derived "fast"/"code". */
	tags: string[];
	/** Raw capability hints derived from the repo's HF tags (vision). */
	capabilities: string[];
	description: string;
	/** The Hugging Face org/user that owns the repo. */
	author: string | null;
	/** SPDX-ish license id, from the repo's card data or a `license:` tag. */
	license: string | null;
	/** Hugging Face like count for the repo. */
	likes: number;
	/** Hugging Face download count for the repo. */
	pullCount: number;
	/** Exact update timestamp (ISO), from the repo's `lastModified`. */
	updatedAt?: string;
	/** Exact ISO creation timestamp from the repo's `createdAt`, distinct from `updatedAt`. */
	createdAt: string | null;
	/** Every GGUF quant found across the dedupe group's repos, for the variant picker, ascending by size. */
	variants?: ModelVariantInfo[];
	/** Other repos this dedupe group collapsed, ordered by publisher rank, for lazily fetching their quants. */
	siblingRepoIds: string[];
};

/** One GGUF file found in a Hugging Face repo, for the variant picker. */
export type ModelVariantInfo = {
	quant: string;
	sizeGb: number | null;
	fileName: string;
	/** The repo this file actually lives in; may differ from the parent `CatalogModel.name` when merged in from a losing dedupe candidate. */
	repoId: string;
};

export type PullProgress = {
	status: string;
	completed?: number;
	total?: number;
};
