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
	/** The router model id, `"{repo}:{QUANT}"` — verbatim what `POST /models` takes. */
	id: string;
	/** From the matching catalog entry when found; the router doesn't report file size. */
	sizeBytes: number | null;
	/** Parsed from the id's `:QUANT` suffix, e.g. "Q4_K_M". */
	quant: string | null;
	/** Billions of parameters parsed from the id, when derivable. */
	paramB: number | null;
	status: "loaded" | "loading" | "unloaded";
	vision: boolean;
};

export type RuntimeStatus =
	| {
			found: true;
			runtimeUrl: string;
			installedModels: InstalledModel[];
			/** The discovered llama.cpp endpoint's id, for per-model settings scoping. */
			endpointId: string;
	  }
	| {
			found: false;
			runtimeUrl: null;
			installedModels: InstalledModel[];
			endpointId: null;
	  };

export type CatalogModel = {
	/** `"{repo}:{QUANT}"` — verbatim what `POST /models` (router mode) takes. */
	id: string;
	/** The Hugging Face repo id, e.g. "ggml-org/gemma-3-4b-it-GGUF". */
	name: string;
	/** Billions of parameters parsed from the repo id; null when unparseable. */
	paramB: number | null;
	/** Exact GGUF file size in GB, from the repo's file tree. */
	sizeGb: number | null;
	/** Context window in K tokens, from the repo's `config.json` when cheaply available. */
	contextK: number | null;
	/** Display tags: capability badges plus derived "fast"/"code". */
	tags: string[];
	/** Raw capability hints derived from the repo's HF tags (vision, code, tools). */
	capabilities: string[];
	description: string;
	/** Hugging Face download count for the repo. */
	pullCount: string;
	/** Relative update time, e.g. "1 year ago". */
	updated: string;
	/** Exact update timestamp (ISO), from the repo's `lastModified`. */
	updatedAt?: string;
	/** Every GGUF quant found in the repo's file tree, for the variant picker. */
	variants?: ModelVariantInfo[];
};

/** One GGUF file found in a Hugging Face repo's tree, for the variant picker. */
export type ModelVariantInfo = {
	quant: string;
	sizeGb: number | null;
	fileName: string;
};

export type PullProgress = {
	status: string;
	completed?: number;
	total?: number;
	error?: string;
	bytesPerSec?: number;
};
