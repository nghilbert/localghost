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
	id: string;
	name: string;
	family: string;
	paramB: number;
	vramGb: number;
	ramGb: number;
	contextK: number;
	tags: string[];
	description: string;
};

export type FitTier = "gpu-optimal" | "gpu-tight" | "cpu-only" | "too-large";

export type FitScore = {
	tier: FitTier;
	gpuHeadroomPct: number | null;
	cpuHeadroomGb: number;
	overall: number;
};

export type OllamaContainerStatus = "running" | "stopped" | "absent" | "docker-unavailable";

export type InstallCapabilities = {
	dockerAvailable: boolean;
	inContainer: boolean;
	platform: NodeJS.Platform;
	containerStatus: OllamaContainerStatus;
};

export type InstallPhase =
	| "idle"
	| "pulling-image"
	| "starting"
	| "waiting-api"
	| "ready"
	| "error";

export type InstallState = {
	phase: InstallPhase;
	message?: string;
	error?: string;
};

export type PullProgress = {
	status: string;
	completed?: number;
	total?: number;
	error?: string;
};
