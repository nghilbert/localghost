import { execSync } from "node:child_process";
import os from "node:os";
import { z } from "zod/v4";
import type { GpuInfo, HardwareInfo } from "#/features/library/lib/types";

const rocmMemInfoSchema = z.record(z.string(), z.record(z.string(), z.number()));

/** Queries `nvidia-smi` for installed NVIDIA GPUs, or `null` if the tool is absent or returns nothing. */
function detectNvidiaGpus(): GpuInfo[] | null {
	try {
		const out = execSync(
			"nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv,noheader,nounits",
			{ timeout: 5000, stdio: ["pipe", "pipe", "pipe"] },
		)
			.toString()
			.trim();
		if (!out) return null;
		return out.split("\n").map((line): GpuInfo => {
			const [name, total, free] = line.split(", ").map((s) => s.trim());
			return {
				name: name ?? "Unknown GPU",
				vendor: "nvidia",
				totalVramMb: Number.parseInt(total ?? "0", 10),
				freeVramMb: Number.parseInt(free ?? "0", 10),
			};
		});
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
		})
			.toString()
			.trim();
		const data = rocmMemInfoSchema.parse(JSON.parse(out));
		const entries = Object.entries(data);
		if (!entries.length) return null;
		return entries.map(
			([name, info]): GpuInfo => ({
				name,
				vendor: "amd",
				totalVramMb: Math.round((info["VRAM Total Memory (B)"] ?? 0) / 1024 / 1024),
				freeVramMb: Math.round(
					((info["VRAM Total Memory (B)"] ?? 0) - (info["VRAM Total Used Memory (B)"] ?? 0)) /
						1024 /
						1024,
				),
			}),
		);
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
