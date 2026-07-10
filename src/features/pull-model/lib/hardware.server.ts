import { execSync } from "node:child_process";
import os from "node:os";
import { z } from "zod/v4";
import type { GpuInfo, HardwareInfo } from "#/features/pull-model/lib/types";

const rocmMemInfoSchema = z.record(z.string(), z.record(z.string(), z.number()));

/**
 * Parses `nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv,noheader,nounits`
 * output (one GPU per line, MB already), skipping blank lines. `null` when empty.
 */
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
 * Parses `rocm-smi --showmeminfo vram --json` output (a card-keyed object of
 * byte totals), converting bytes to MB. `null` when empty; throws on bad JSON/shape.
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

/** Queries `nvidia-smi` for installed NVIDIA GPUs, or `null` if the tool is absent or returns nothing. */
function detectNvidiaGpus(): GpuInfo[] | null {
	try {
		const out = execSync(
			"nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv,noheader,nounits",
			{ timeout: 5000, stdio: ["pipe", "pipe", "pipe"] },
		).toString();
		return parseNvidiaSmi(out);
	} catch {
		return null;
	}
}

/** Queries `rocm-smi` for installed AMD GPUs, or `null` if the tool is absent or returns nothing. */
function detectAmdGpus(): GpuInfo[] | null {
	try {
		const out = execSync("rocm-smi --showmeminfo vram --json", {
			timeout: 5000,
			stdio: ["pipe", "pipe", "pipe"],
		}).toString();
		return parseRocmSmi(out);
	} catch {
		return null;
	}
}

/**
 * Reports host CPU and RAM totals along with any detected GPUs, preferring NVIDIA over AMD.
 *
 * @returns CPU model and count, total/free RAM in GB, and detected GPUs (or `null` when none).
 */
export function getHardwareInfo(): HardwareInfo {
	const cpus = os.cpus();
	return {
		totalRamGb: os.totalmem() / 1024 ** 3,
		freeRamGb: os.freemem() / 1024 ** 3,
		cpuModel: cpus[0]?.model ?? "Unknown CPU",
		cpuCount: cpus.length,
		gpus: detectNvidiaGpus() ?? detectAmdGpus(),
	};
}
