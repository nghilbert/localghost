import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import type {
	GpuVendor,
	InstallCapabilities,
	InstallPhase,
	InstallState,
	OllamaContainerStatus,
} from "#/features/cookbook/lib/types";
import { probeOllama } from "#/lib/ollama.server";

const execFileAsync = promisify(execFile);

const OLLAMA_CONTAINER_NAME = "ollama";
const API_POLL_INTERVAL_MS = 1000;
const API_POLL_TIMEOUT_MS = 60_000;

// Single-process server: one in-memory install at a time is all we need.
let installState: InstallState = { phase: "idle" };

const IN_PROGRESS_PHASES: InstallPhase[] = ["pulling-image", "starting", "waiting-api"];

/**
 * Fixed docker argv templates keyed only by detected GPU vendor. Nothing here
 * may ever be derived from request data — these arrays reach execFile verbatim.
 */
export function buildDockerRunArgs(gpuVendor: GpuVendor | null): string[] {
	const gpuFlags =
		gpuVendor === "nvidia"
			? ["--gpus=all"]
			: gpuVendor === "amd"
				? ["--device", "/dev/kfd", "--device", "/dev/dri"]
				: [];
	return [
		"run",
		"-d",
		...gpuFlags,
		"-v",
		"ollama:/root/.ollama",
		"-p",
		"11434:11434",
		"--name",
		OLLAMA_CONTAINER_NAME,
		"--restart",
		"unless-stopped",
		dockerImageFor(gpuVendor),
	];
}

export function dockerImageFor(gpuVendor: GpuVendor | null): string {
	return gpuVendor === "amd" ? "ollama/ollama:rocm" : "ollama/ollama";
}

async function isDockerAvailable(): Promise<boolean> {
	try {
		await execFileAsync("docker", ["version", "--format", "{{.Server.Version}}"], {
			timeout: 5000,
		});
		return true;
	} catch {
		return false;
	}
}

async function getContainerStatus(): Promise<OllamaContainerStatus> {
	try {
		const { stdout } = await execFileAsync(
			"docker",
			["inspect", "--format", "{{.State.Running}}", OLLAMA_CONTAINER_NAME],
			{ timeout: 5000 },
		);
		return stdout.trim() === "true" ? "running" : "stopped";
	} catch {
		return "absent";
	}
}

export async function getInstallCapabilities(): Promise<InstallCapabilities> {
	const dockerAvailable = await isDockerAvailable();
	return {
		dockerAvailable,
		inContainer: existsSync("/.dockerenv"),
		platform: process.platform,
		containerStatus: dockerAvailable ? await getContainerStatus() : "docker-unavailable",
	};
}

export function getInstallState(): InstallState {
	return installState;
}

function truncateError(err: unknown): string {
	const message = err instanceof Error ? err.message : String(err);
	return message.length > 500 ? `${message.slice(0, 500)}…` : message;
}

async function waitForOllamaApi(): Promise<string> {
	// The container publishes on the host; from inside a container the host is
	// reachable via host.docker.internal (mapped by docker-compose).
	const urls = existsSync("/.dockerenv")
		? ["http://host.docker.internal:11434", "http://localhost:11434"]
		: ["http://localhost:11434", "http://127.0.0.1:11434"];

	const deadline = Date.now() + API_POLL_TIMEOUT_MS;
	while (Date.now() < deadline) {
		for (const url of urls) {
			const probe = await probeOllama(url, 1000);
			if (probe.reachable) return url;
		}
		await new Promise((resolve) => setTimeout(resolve, API_POLL_INTERVAL_MS));
	}
	throw new Error("Ollama container started but its API never became reachable");
}

async function runInstall(gpuVendor: GpuVendor | null): Promise<void> {
	const containerStatus = await getContainerStatus();

	if (containerStatus !== "running") {
		if (containerStatus === "stopped") {
			installState = { phase: "starting", message: "Starting existing Ollama container" };
			await execFileAsync("docker", ["start", OLLAMA_CONTAINER_NAME], { timeout: 60_000 });
		} else {
			installState = { phase: "pulling-image", message: "Downloading the Ollama image" };
			await execFileAsync("docker", ["pull", dockerImageFor(gpuVendor)], {
				timeout: 600_000,
			});
			installState = { phase: "starting", message: "Starting the Ollama container" };
			await execFileAsync("docker", buildDockerRunArgs(gpuVendor), { timeout: 60_000 });
		}
	}

	installState = { phase: "waiting-api", message: "Waiting for Ollama to come online" };
	await waitForOllamaApi();
	installState = { phase: "ready" };
}

/**
 * Kicks off the docker-based Ollama install in the background. Idempotent
 * while an install is already in progress.
 */
export function beginOllamaInstall(gpuVendor: GpuVendor | null): InstallState {
	if (IN_PROGRESS_PHASES.includes(installState.phase)) return installState;

	installState = { phase: "pulling-image", message: "Preparing install" };
	void runInstall(gpuVendor).catch((err) => {
		installState = { phase: "error", error: truncateError(err) };
	});
	return installState;
}

export async function startOllamaContainer(): Promise<void> {
	await execFileAsync("docker", ["start", OLLAMA_CONTAINER_NAME], { timeout: 60_000 });
}

export async function stopOllamaContainer(): Promise<void> {
	await execFileAsync("docker", ["stop", OLLAMA_CONTAINER_NAME], { timeout: 60_000 });
}
