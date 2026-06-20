import type { CatalogModel, FitScore, HardwareInfo } from "./types";

export const CATALOG: CatalogModel[] = [
	// Meta Llama 3.2
	{
		id: "llama3.2:1b",
		name: "Llama 3.2",
		family: "Meta",
		paramB: 1,
		vramGb: 1.2,
		ramGb: 2,
		contextK: 128,
		tags: ["chat", "fast", "multilingual"],
		description: "Ultra-compact. Great for quick responses on any hardware.",
	},
	{
		id: "llama3.2:3b",
		name: "Llama 3.2",
		family: "Meta",
		paramB: 3,
		vramGb: 2.4,
		ramGb: 4,
		contextK: 128,
		tags: ["chat", "fast", "multilingual"],
		description: "Best quality-to-size ratio. The go-to for low-end hardware.",
	},

	// Meta Llama 3.1
	{
		id: "llama3.1:8b",
		name: "Llama 3.1",
		family: "Meta",
		paramB: 8,
		vramGb: 5.5,
		ramGb: 9,
		contextK: 128,
		tags: ["chat", "multilingual"],
		description: "Strong all-rounder with 128K context support.",
	},
	{
		id: "llama3.1:70b",
		name: "Llama 3.1",
		family: "Meta",
		paramB: 70,
		vramGb: 43,
		ramGb: 64,
		contextK: 128,
		tags: ["chat", "multilingual", "large"],
		description: "Near-frontier quality. Requires a high-end GPU.",
	},

	// Qwen 2.5
	{
		id: "qwen2.5:0.5b",
		name: "Qwen 2.5",
		family: "Alibaba",
		paramB: 0.5,
		vramGb: 0.6,
		ramGb: 1,
		contextK: 32,
		tags: ["chat", "fast"],
		description: "Tiny but surprisingly capable for simple tasks.",
	},
	{
		id: "qwen2.5:3b",
		name: "Qwen 2.5",
		family: "Alibaba",
		paramB: 3,
		vramGb: 2.4,
		ramGb: 4,
		contextK: 32,
		tags: ["chat", "multilingual"],
		description: "Compact multilingual model with good instruction following.",
	},
	{
		id: "qwen2.5:7b",
		name: "Qwen 2.5",
		family: "Alibaba",
		paramB: 7,
		vramGb: 4.8,
		ramGb: 8,
		contextK: 128,
		tags: ["chat", "multilingual", "code"],
		description: "Excellent multilingual and coding performance.",
	},
	{
		id: "qwen2.5:14b",
		name: "Qwen 2.5",
		family: "Alibaba",
		paramB: 14,
		vramGb: 9.5,
		ramGb: 16,
		contextK: 128,
		tags: ["chat", "multilingual", "code"],
		description: "Strong reasoning across languages and code.",
	},
	{
		id: "qwen2.5:32b",
		name: "Qwen 2.5",
		family: "Alibaba",
		paramB: 32,
		vramGb: 20,
		ramGb: 36,
		contextK: 128,
		tags: ["chat", "multilingual", "code", "large"],
		description: "Best Qwen 2.5 size for quality vs hardware tradeoff.",
	},

	// Qwen 2.5 Coder
	{
		id: "qwen2.5-coder:7b",
		name: "Qwen 2.5 Coder",
		family: "Alibaba",
		paramB: 7,
		vramGb: 4.8,
		ramGb: 8,
		contextK: 32,
		tags: ["code"],
		description: "Specialized for coding tasks with excellent autocomplete.",
	},
	{
		id: "qwen2.5-coder:14b",
		name: "Qwen 2.5 Coder",
		family: "Alibaba",
		paramB: 14,
		vramGb: 9.5,
		ramGb: 16,
		contextK: 32,
		tags: ["code"],
		description: "Top-tier coding model at this size class.",
	},

	// DeepSeek R1 (reasoning)
	{
		id: "deepseek-r1:1.5b",
		name: "DeepSeek R1",
		family: "DeepSeek",
		paramB: 1.5,
		vramGb: 1.4,
		ramGb: 2.5,
		contextK: 128,
		tags: ["reasoning", "fast"],
		description: "Tiny reasoning model with chain-of-thought quality.",
	},
	{
		id: "deepseek-r1:7b",
		name: "DeepSeek R1",
		family: "DeepSeek",
		paramB: 7,
		vramGb: 4.8,
		ramGb: 8,
		contextK: 128,
		tags: ["reasoning", "math"],
		description: "Strong math and reasoning. Open weights.",
	},
	{
		id: "deepseek-r1:14b",
		name: "DeepSeek R1",
		family: "DeepSeek",
		paramB: 14,
		vramGb: 9.5,
		ramGb: 16,
		contextK: 128,
		tags: ["reasoning", "math"],
		description: "Best value for reasoning tasks under 20GB VRAM.",
	},
	{
		id: "deepseek-r1:32b",
		name: "DeepSeek R1",
		family: "DeepSeek",
		paramB: 32,
		vramGb: 20,
		ramGb: 36,
		contextK: 128,
		tags: ["reasoning", "math", "large"],
		description: "Near-frontier reasoning capability.",
	},
	{
		id: "deepseek-r1:70b",
		name: "DeepSeek R1",
		family: "DeepSeek",
		paramB: 70,
		vramGb: 43,
		ramGb: 64,
		contextK: 128,
		tags: ["reasoning", "math", "large"],
		description: "State-of-the-art open reasoning model.",
	},

	// Microsoft Phi
	{
		id: "phi4:14b",
		name: "Phi 4",
		family: "Microsoft",
		paramB: 14,
		vramGb: 9.5,
		ramGb: 16,
		contextK: 16,
		tags: ["chat", "reasoning"],
		description: "Microsoft's punchy mid-size model. Strong at instruction following.",
	},
	{
		id: "phi4-mini:3.8b",
		name: "Phi 4 Mini",
		family: "Microsoft",
		paramB: 3.8,
		vramGb: 2.8,
		ramGb: 5,
		contextK: 128,
		tags: ["chat", "fast", "reasoning"],
		description: "Compact and capable. Great for devices with limited VRAM.",
	},

	// Google Gemma 3
	{
		id: "gemma3:1b",
		name: "Gemma 3",
		family: "Google",
		paramB: 1,
		vramGb: 0.9,
		ramGb: 1.5,
		contextK: 32,
		tags: ["chat", "fast"],
		description: "Google's smallest Gemma 3.",
	},
	{
		id: "gemma3:4b",
		name: "Gemma 3",
		family: "Google",
		paramB: 4,
		vramGb: 3,
		ramGb: 5,
		contextK: 128,
		tags: ["chat"],
		description: "Compact model with strong general performance.",
	},
	{
		id: "gemma3:12b",
		name: "Gemma 3",
		family: "Google",
		paramB: 12,
		vramGb: 8,
		ramGb: 14,
		contextK: 128,
		tags: ["chat"],
		description: "Google's strong mid-size model.",
	},
	{
		id: "gemma3:27b",
		name: "Gemma 3",
		family: "Google",
		paramB: 27,
		vramGb: 17,
		ramGb: 30,
		contextK: 128,
		tags: ["chat", "large"],
		description: "Top Google open model.",
	},

	// Mistral
	{
		id: "mistral:7b",
		name: "Mistral",
		family: "Mistral AI",
		paramB: 7,
		vramGb: 4.8,
		ramGb: 8,
		contextK: 32,
		tags: ["chat", "fast"],
		description: "Fast, reliable, and widely used.",
	},
	{
		id: "mistral-nemo:12b",
		name: "Mistral Nemo",
		family: "Mistral AI",
		paramB: 12,
		vramGb: 8,
		ramGb: 14,
		contextK: 128,
		tags: ["chat"],
		description: "Strong 12B with long context.",
	},

	// QwQ (reasoning)
	{
		id: "qwq:32b",
		name: "QwQ",
		family: "Alibaba",
		paramB: 32,
		vramGb: 20,
		ramGb: 36,
		contextK: 128,
		tags: ["reasoning", "math", "large"],
		description: "Qwen's dedicated reasoning model. Excellent math and logic.",
	},

	// Embedding models
	{
		id: "nomic-embed-text",
		name: "Nomic Embed Text",
		family: "Nomic",
		paramB: 0.137,
		vramGb: 0.3,
		ramGb: 0.5,
		contextK: 8,
		tags: ["embedding"],
		description: "High-quality text embeddings. Powers RAG and memory search.",
	},
	{
		id: "mxbai-embed-large",
		name: "mxbai Embed Large",
		family: "Mixedbread",
		paramB: 0.334,
		vramGb: 0.7,
		ramGb: 1,
		contextK: 0.5,
		tags: ["embedding"],
		description: "Excellent embedding quality for semantic search.",
	},
];

export function computeFit(model: CatalogModel, hw: HardwareInfo): FitScore {
	const vramNeededMb = model.vramGb * 1024;
	const bestGpu = hw.gpus?.reduce<NonNullable<typeof hw.gpus>[number] | null>(
		(best, g) => (g.totalVramMb > (best?.totalVramMb ?? 0) ? g : best),
		null,
	);

	let gpuHeadroomPct: number | null = null;
	let tier: FitScore["tier"];

	if (bestGpu && bestGpu.totalVramMb >= vramNeededMb) {
		gpuHeadroomPct = Math.round(((bestGpu.totalVramMb - vramNeededMb) / bestGpu.totalVramMb) * 100);
		tier = gpuHeadroomPct >= 20 ? "gpu-optimal" : "gpu-tight";
	} else {
		const cpuRamNeeded = model.ramGb;
		const usableRamGb = hw.totalRamGb - 2;
		const cpuHeadroomGb = usableRamGb - cpuRamNeeded;
		if (cpuHeadroomGb >= 0) {
			tier = "cpu-only";
		} else {
			tier = "too-large";
		}
	}

	const cpuHeadroomGb = Math.max(0, hw.totalRamGb - 2 - model.ramGb);

	let overall: number;
	if (tier === "gpu-optimal") overall = 90 + Math.min(10, gpuHeadroomPct ?? 0) / 10;
	else if (tier === "gpu-tight") overall = 70 + Math.max(0, (gpuHeadroomPct ?? 0) / 2);
	else if (tier === "cpu-only") overall = 40 + Math.min(30, cpuHeadroomGb * 2);
	else overall = Math.max(0, 20 - Math.abs(cpuHeadroomGb) * 2);

	return { tier, gpuHeadroomPct, cpuHeadroomGb, overall: Math.round(overall) };
}
