import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import {
	INSTALL_IN_PROGRESS_PHASES,
	type InstallCapabilities,
	type InstallState,
	type OllamaContainerStatus,
	type OllamaInstallVariant,
} from "#/features/cookbook/lib/types";
import { localOllamaUrls, probeOllama } from "#/lib/ollama.server";

const execFileAsync = promisify(execFile);

const OLLAMA_CONTAINER_NAME = "ollama";
const API_POLL_INTERVAL_MS = 1000;
const API_POLL_TIMEOUT_MS = 60_000;

// Single-process server: one in-memory install at a time is all we need.
let installState: InstallState = { phase: "idle" };

/**
 * Fixed docker argv templates keyed only by the install variant — a
 * Zod-validated enum. Nothing here may ever be derived from free-form request
 * data — these arrays reach execFile verbatim.
 */
export function buildDockerRunArgs(variant: OllamaInstallVariant): string[] {
	const gpuFlags =
		variant === "nvidia"
			? ["--gpus=all"]
			: variant === "amd"
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
		dockerImageFor(variant),
	];
}

export function dockerImageFor(variant: OllamaInstallVariant): string {
	return variant === "amd" ? "ollama/ollama:rocm" : "ollama/ollama";
}

/**
 * Whether the host docker daemon has the nvidia container runtime registered —
 * the actual precondition for `--gpus=all`, and the only NVIDIA signal visible
 * from inside a container (no nvidia-smi here).
 */
export async function hasNvidiaContainerRuntime(): Promise<boolean> {
	try {
		const { stdout } = await execFileAsync("docker", ["info", "--format", "{{json .Runtimes}}"], {
			timeout: 5000,
		});
		const runtimes = JSON.parse(stdout.trim()) as Record<string, unknown>;
		return "nvidia" in runtimes;
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
	const [containerStatus, nvidiaRuntime] = await Promise.all([
		getContainerStatus(),
		hasNvidiaContainerRuntime(),
	]);
	return {
		inContainer: existsSync("/.dockerenv"),
		platform: process.platform,
		containerStatus,
		nvidiaRuntime,
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
	// reachable via host.docker.internal (mapped by compose.yaml).
	const urls = localOllamaUrls(existsSync("/.dockerenv"));

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

async function runInstall(variant: OllamaInstallVariant): Promise<void> {
	const containerStatus = await getContainerStatus();

	if (containerStatus !== "running") {
		if (containerStatus === "stopped") {
			installState = { phase: "starting", message: "Starting existing Ollama container" };
			await execFileAsync("docker", ["start", OLLAMA_CONTAINER_NAME], { timeout: 60_000 });
		} else {
			installState = { phase: "pulling-image", message: "Downloading the Ollama image" };
			await execFileAsync("docker", ["pull", dockerImageFor(variant)], {
				timeout: 600_000,
			});
			installState = { phase: "starting", message: "Starting the Ollama container" };
			await execFileAsync("docker", buildDockerRunArgs(variant), { timeout: 60_000 });
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
export function beginOllamaInstall(variant: OllamaInstallVariant): InstallState {
	if (INSTALL_IN_PROGRESS_PHASES.includes(installState.phase)) return installState;

	installState = { phase: "pulling-image", message: "Preparing install" };
	void runInstall(variant).catch((err) => {
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
