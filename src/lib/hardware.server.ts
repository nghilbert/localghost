import { execSync } from "node:child_process";
import os from "node:os";
import type { GpuInfo, HardwareInfo } from "#/features/cookbook/lib/types";

function detectNvidiaGpus(): GpuInfo[] | null {
	try {
		const out = execSync(
			"nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv,noheader,nounits",
			{ timeout: 5000, stdio: ["pipe", "pipe", "pipe"] },
		)
			.toString()
			.trim();
		if (!out) return null;
		return out.split("\n").map((line) => {
			const [name, total, free] = line.split(", ").map((s) => s.trim());
			return {
				name: name ?? "Unknown GPU",
				totalVramMb: Number.parseInt(total ?? "0", 10),
				freeVramMb: Number.parseInt(free ?? "0", 10),
			};
		});
	} catch {
		return null;
	}
}

function detectAmdGpus(): GpuInfo[] | null {
	try {
		const out = execSync("rocm-smi --showmeminfo vram --json", {
			timeout: 5000,
			stdio: ["pipe", "pipe", "pipe"],
		})
			.toString()
			.trim();
		const data = JSON.parse(out) as Record<string, Record<string, number>>;
		const entries = Object.entries(data);
		if (!entries.length) return null;
		return entries.map(([name, info]) => ({
			name,
			totalVramMb: Math.round((info["VRAM Total Memory (B)"] ?? 0) / 1024 / 1024),
			freeVramMb: Math.round(
				((info["VRAM Total Memory (B)"] ?? 0) - (info["VRAM Total Used Memory (B)"] ?? 0)) /
					1024 /
					1024,
			),
		}));
	} catch {
		return null;
	}
}

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
