import { execFile } from "node:child_process";
import os from "node:os";
import { promisify } from "node:util";
import { z } from "zod";
import type { GpuInfo, HardwareInfo } from "#/features/library/library.types";

const execFileAsync = promisify(execFile);

const rocmMemInfoSchema = z.record(z.string(), z.record(z.string(), z.number()));

/** Parses `nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv,noheader,nounits`. `null` when empty. */
export function parseNvidiaSmi(output: string): GpuInfo[] | null {
	const lines = output
		.trim()
		.split("\n")
		.filter((line) => line.trim());
	if (!lines.length) return null;
	return lines.map((line): GpuInfo => {
		const [name, total, free] = line.split(", ").map((s) => s.trim());
		return {
			name: name || "Unknown GPU",
			vendor: "nvidia",
			totalVramMb: Number.parseInt(total ?? "0", 10) || 0,
			freeVramMb: Number.parseInt(free ?? "0", 10) || 0,
		};
	});
}

/**
 * Parses `rocm-smi --showmeminfo vram --json`. `null` when empty.
 * @throws On output that is not the expected JSON.
 */
export function parseRocmSmi(output: string): GpuInfo[] | null {
	const data = rocmMemInfoSchema.parse(JSON.parse(output));
	const entries = Object.entries(data);
	if (!entries.length) return null;
	return entries.map(([name, info]): GpuInfo => {
		const total = info["VRAM Total Memory (B)"] ?? 0;
		const used = info["VRAM Total Used Memory (B)"] ?? 0;
		return {
			name,
			vendor: "amd",
			totalVramMb: Math.round(total / 1024 / 1024),
			freeVramMb: Math.round((total - used) / 1024 / 1024),
		};
	});
}

/** Whether the command is not installed, the normal case without that GPU vendor. */
function isMissingCommand(error: unknown): boolean {
	return error !== null && typeof error === "object" && "code" in error && error.code === "ENOENT";
}

async function detectNvidiaGpus(): Promise<GpuInfo[] | null> {
	try {
		const { stdout } = await execFileAsync(
			"nvidia-smi",
			["--query-gpu=name,memory.total,memory.free", "--format=csv,noheader,nounits"],
			{ timeout: 5000 },
		);
		return parseNvidiaSmi(stdout);
	} catch (error) {
		if (!isMissingCommand(error)) console.warn("nvidia-smi probe failed", { error });
		return null;
	}
}

async function detectAmdGpus(): Promise<GpuInfo[] | null> {
	try {
		const { stdout } = await execFileAsync("rocm-smi", ["--showmeminfo", "vram", "--json"], {
			timeout: 5000,
		});
		return parseRocmSmi(stdout);
	} catch (error) {
		if (!isMissingCommand(error)) console.warn("rocm-smi probe failed", { error });
		return null;
	}
}

/** The host's CPU, RAM, and GPUs, checking NVIDIA before AMD. */
export async function getHardwareInfo(): Promise<HardwareInfo> {
	const cpus = os.cpus();
	return {
		totalRamGb: os.totalmem() / 1024 ** 3,
		freeRamGb: os.freemem() / 1024 ** 3,
		cpuModel: cpus[0]?.model ?? "Unknown CPU",
		cpuCount: cpus.length,
		gpus: (await detectNvidiaGpus()) ?? (await detectAmdGpus()),
	};
}
