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

export type OllamaInstalledModel = {
	name: string;
	sizeBytes: number;
	family: string;
	parameterSize: string;
	quantizationLevel: string;
};

export type OllamaStatus =
	| {
			found: true;
			ollamaUrl: string;
			installedModels: OllamaInstalledModel[];
			/** The endpoint's saved num_ctx override, null when using the default. */
			numCtx: number | null;
			/** The discovered Ollama endpoint's id, for per-model settings scoping. */
			endpointId: string;
	  }
	| {
			found: false;
			ollamaUrl: null;
			installedModels: OllamaInstalledModel[];
			numCtx: null;
			endpointId: null;
	  };

export type CatalogModel = {
	/** The exact `ollama pull` id, e.g. "llama3.1:8b". */
	id: string;
	/** Base model name without the size tag, e.g. "llama3.1". */
	name: string;
	/** Billions of parameters parsed from the size tag; null when unparseable. */
	paramB: number | null;
	/** Actual download size from the model's tags page; null until enriched. */
	sizeGb: number | null;
	/** Context window in K tokens from the tags page, e.g. 128 for "128K". */
	contextK: number | null;
	/** Display tags: capability badges plus derived "fast"/"code". */
	tags: string[];
	/** Raw capability badges from the library (tools, vision, embedding, thinking). */
	capabilities: string[];
	description: string;
	/** Pull count as shown on the library, e.g. "116.6M". */
	pullCount: string;
	/** Relative update time as shown on the library, e.g. "1 year ago". */
	updated: string;
	/** Exact update timestamp (ISO) parsed from the row title, when present. */
	updatedAt?: string;
	/** Every quant/size tag on the model's tags page, for the variant picker. */
	variants?: ModelTagInfo[];
};

/** One tag row parsed from a model's ollama.com tags page. */
export type ModelTagInfo = {
	tag: string;
	/** Short blob digest; identical digests mean identical weights (e.g. `latest` = `8b`). */
	digest: string | null;
	sizeGb: number | null;
	contextK: number | null;
};

export type PullProgress = {
	status: string;
	completed?: number;
	total?: number;
	error?: string;
	bytesPerSec?: number;
};
