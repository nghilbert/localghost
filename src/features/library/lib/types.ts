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
	| { found: true; ollamaUrl: string; installedModels: OllamaInstalledModel[] }
	| { found: false; ollamaUrl: null; installedModels: OllamaInstalledModel[] };

export type CatalogModel = {
	/** The exact `ollama pull` id, e.g. "llama3.1:8b". */
	id: string;
	/** Base model name without the size tag, e.g. "llama3.1". */
	name: string;
	/** Billions of parameters parsed from the size tag; null when unparseable. */
	paramB: number | null;
	/** Estimated footprint derived from paramB (heuristic, not scraped). */
	vramGb: number;
	ramGb: number;
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
};

export type FitTier = "gpu-optimal" | "gpu-tight" | "cpu-only" | "too-large";

export type FitScore = {
	tier: FitTier;
	gpuHeadroomPct: number | null;
	cpuHeadroomGb: number;
	overall: number;
};

export type PullProgress = {
	status: string;
	completed?: number;
	total?: number;
	error?: string;
	bytesPerSec?: number;
};
