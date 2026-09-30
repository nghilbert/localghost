/** A GPU vendor the hardware probe recognizes. */
type GpuVendor = "nvidia" | "amd";

/** One GPU and its memory. */
export type GpuInfo = {
	name: string;
	vendor: GpuVendor;
	totalVramMb: number;
	freeVramMb: number;
};

/** The host's memory, CPU, and GPUs. `gpus` is null when none were detected. */
export type HardwareInfo = {
	totalRamGb: number;
	freeRamGb: number;
	cpuModel: string;
	cpuCount: number;
	gpus: GpuInfo[] | null;
};

/** A model on the local runtime. */
export type InstalledModel = {
	/** The router model id, `"{repo}:{QUANT}"`. */
	id: string;
	/** From the catalog, since the router doesn't report file size. */
	sizeBytes: number | null;
	/** The id's `:QUANT` suffix, e.g. "Q4_K_M". */
	quant: string | null;
	/** Billions of parameters, when the id says. */
	paramB: number | null;
	/** `"downloaded"` means the download finished but the router hasn't loaded the list again yet. */
	status: "loaded" | "loading" | "unloaded" | "sleeping" | "downloaded";
	vision: boolean;
};

/** Whether a llama.cpp runtime was found, with its models and running downloads. */
export type RuntimeStatus =
	| {
			found: true;
			runtimeUrl: string;
			installedModels: InstalledModel[];
			downloads: Record<string, PullProgress>;
			/** The runtime's saved endpoint id. */
			endpointId: string;
	  }
	| {
			found: false;
			runtimeUrl: null;
			installedModels: InstalledModel[];
			downloads: Record<string, PullProgress>;
			endpointId: null;
	  };

/** A model in the Library catalog, built from its Hugging Face repo. */
export type CatalogModel = {
	/** `"{repo}:{QUANT}"` for the default quant, as `POST /models` takes it. */
	id: string;
	/** The Hugging Face repo id, e.g. "ggml-org/gemma-3-4b-it-GGUF". */
	name: string;
	/** A readable name from the repo id, e.g. "Gemma 3 4B". */
	displayName: string;
	/** Billions of parameters, from GGUF metadata or else the repo id. */
	paramB: number | null;
	/** The default quant's file size in GB. */
	sizeGb: number | null;
	/** Context window in thousands of tokens. */
	contextK: number | null;
	/** Display tags, including "fast" and "code". */
	tags: string[];
	/** Capabilities from the repo's tags, such as "vision". */
	capabilities: string[];
	description: string;
	/** The Hugging Face user or org that owns the repo. */
	author: string | null;
	license: string | null;
	likes: number;
	/** Hugging Face download count. */
	pullCount: number;
	/** ISO timestamp of the repo's last change. */
	updatedAt?: string;
	/** ISO timestamp of the repo's creation. */
	createdAt: string | null;
	/** Every quant across the model's repos, smallest first. */
	variants?: ModelVariantInfo[];
	/** Other repos of the same model, best publisher first, whose quants load on demand. */
	siblingRepoIds: string[];
};

/** One GGUF file in a Hugging Face repo. */
export type ModelVariantInfo = {
	quant: string;
	sizeGb: number | null;
	fileName: string;
	/** The repo holding this file, which can differ from the model's main repo. */
	repoId: string;
};

/** A download's status and byte progress. */
export type PullProgress = {
	status: string;
	completed?: number;
	total?: number;
};

/** Which models the Library list shows. */
export type ModelStatus = "all" | "installed" | "available";
