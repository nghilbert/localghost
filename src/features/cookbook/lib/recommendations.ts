import { CATALOG, computeFit } from "#/features/cookbook/lib/catalog";
import type {
	CatalogModel,
	FitScore,
	GpuInfo,
	HardwareInfo,
	OllamaInstalledModel,
	OllamaInstallVariant,
} from "#/features/cookbook/lib/types";

/**
 * Picks the Ollama install variant to recommend: a directly detected GPU wins;
 * otherwise a registered nvidia container runtime implies an NVIDIA GPU (the
 * only signal visible from inside a container); CPU is the safe fallback.
 */
export function recommendInstallVariant(opts: {
	gpus: GpuInfo[] | null;
	nvidiaRuntime: boolean;
}): OllamaInstallVariant {
	const detectedVendor = opts.gpus?.[0]?.vendor;
	if (detectedVendor) return detectedVendor;
	return opts.nvidiaRuntime ? "nvidia" : "cpu";
}

export type RecommendationReason = "best-overall" | "fastest" | "best-coding";

export type Recommendation = {
	model: CatalogModel;
	fit: FitScore;
	reason: RecommendationReason;
};

const TIER_RANK: Record<FitScore["tier"], number> = {
	"gpu-optimal": 3,
	"gpu-tight": 2,
	"cpu-only": 1,
	"too-large": 0,
};

type ScoredModel = { model: CatalogModel; fit: FitScore };

/** Best tier first, then the largest model that achieves it. */
function byCapability(a: ScoredModel, b: ScoredModel): number {
	return TIER_RANK[b.fit.tier] - TIER_RANK[a.fit.tier] || b.model.paramB - a.model.paramB;
}

/** Best tier first, then the smallest model — fewer parameters means faster tokens. */
function bySpeed(a: ScoredModel, b: ScoredModel): number {
	return TIER_RANK[b.fit.tier] - TIER_RANK[a.fit.tier] || a.model.paramB - b.model.paramB;
}

/**
 * Picks up to three first models for the detected hardware: the most capable
 * fit, the fastest, and the best coding model. Embedding models, models that
 * don't fit, and already-installed models are excluded.
 */
export function pickRecommendedModels(
	hw: HardwareInfo,
	installed: OllamaInstalledModel[],
): Recommendation[] {
	const installedIds = new Set(installed.map((m) => m.name.replace(/:latest$/, "")));

	const candidates: ScoredModel[] = CATALOG.filter(
		(model) => !model.tags.includes("embedding") && !installedIds.has(model.id),
	)
		.map((model) => ({ model, fit: computeFit(model, hw) }))
		.filter(({ fit }) => fit.tier !== "too-large");

	const codingCandidates = candidates.filter(({ model }) => model.tags.includes("code"));
	const fastCandidates = candidates.filter(({ model }) => model.tags.includes("fast"));

	const picks: [RecommendationReason, ScoredModel | undefined][] = [
		["best-overall", [...candidates].sort(byCapability)[0]],
		["fastest", [...(fastCandidates.length ? fastCandidates : candidates)].sort(bySpeed)[0]],
		["best-coding", [...codingCandidates].sort(byCapability)[0]],
	];

	const seen = new Set<string>();
	const recommendations: Recommendation[] = [];
	for (const [reason, scored] of picks) {
		if (!scored || seen.has(scored.model.id)) continue;
		seen.add(scored.model.id);
		recommendations.push({ ...scored, reason });
	}
	return recommendations;
}
