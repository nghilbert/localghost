import { computeFit, parsePullCount, Q4_GB_PER_B } from "#/features/library/lib/catalog";
import type {
	CatalogModel,
	FitScore,
	HardwareInfo,
	OllamaInstalledModel,
} from "#/features/library/lib/types";

export type RecommendationReason = "best-overall" | "fastest" | "best-coding";

export type Recommendation = {
	model: CatalogModel;
	fit: FitScore;
	reason: RecommendationReason;
};

const TIER_RANK: Record<FitScore["tier"], number> = {
	"gpu-optimal": 4,
	"gpu-tight": 3,
	"gpu-partial": 2,
	"cpu-only": 1,
	"too-large": 0,
};

type ScoredModel = { model: CatalogModel; fit: FitScore };

/** Best tier first, then the most-pulled model, then the largest as a final tiebreak. */
function byCapability(a: ScoredModel, b: ScoredModel): number {
	return (
		TIER_RANK[b.fit.tier] - TIER_RANK[a.fit.tier] ||
		popularity(b) - popularity(a) ||
		effectiveParamB(b) - effectiveParamB(a)
	);
}

/** Best tier first, then the smallest model; fewer parameters means faster tokens. */
function bySpeed(a: ScoredModel, b: ScoredModel): number {
	return TIER_RANK[b.fit.tier] - TIER_RANK[a.fit.tier] || effectiveParamB(a) - effectiveParamB(b);
}

/** Parameter count, approximated from the Q4 download size when unparsed. */
function effectiveParamB(scored: ScoredModel): number {
	const { paramB, sizeGb } = scored.model;
	return paramB ?? (sizeGb !== null ? sizeGb / Q4_GB_PER_B : 0);
}

/** Real-world popularity from the library's pull count, as a quality proxy. */
function popularity(scored: ScoredModel): number {
	return parsePullCount(scored.model.pullCount);
}

/**
 * Picks up to three first models for the detected hardware: the most capable
 * fit, the fastest, and the best coding model. Embedding models, models that
 * don't fit, and already-installed models are excluded.
 */
export function pickRecommendedModels({
	hw,
	installed,
	catalog,
}: {
	hw: HardwareInfo;
	installed: OllamaInstalledModel[];
	catalog: CatalogModel[];
}): Recommendation[] {
	const installedIds = new Set(installed.map((m) => m.name.replace(/:latest$/, "")));

	const candidates: ScoredModel[] = catalog
		.filter((model) => !model.tags.includes("embedding") && !installedIds.has(model.id))
		.flatMap((model) => {
			const fit = computeFit({ model, hw });
			return fit === null || fit.tier === "too-large" ? [] : [{ model, fit }];
		});

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
