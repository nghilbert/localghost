import { computeFit, parsePullCount } from "#/features/library/lib/catalog";
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
	"gpu-optimal": 3,
	"gpu-tight": 2,
	"cpu-only": 1,
	"too-large": 0,
};

type ScoredModel = { model: CatalogModel; fit: FitScore };

/** Best tier first, then the most-pulled model, then the largest as a final tiebreak. */
function byCapability(a: ScoredModel, b: ScoredModel): number {
	return (
		TIER_RANK[b.fit.tier] - TIER_RANK[a.fit.tier] ||
		popularity(b) - popularity(a) ||
		paramB(b) - paramB(a)
	);
}

/** Best tier first, then the smallest model; fewer parameters means faster tokens. */
function bySpeed(a: ScoredModel, b: ScoredModel): number {
	return TIER_RANK[b.fit.tier] - TIER_RANK[a.fit.tier] || paramB(a) - paramB(b);
}

/** Candidates are pre-filtered to a known size; coalesce to satisfy the types. */
function paramB(scored: ScoredModel): number {
	return scored.model.paramB ?? 0;
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
		.filter(
			(model) =>
				model.paramB !== null && !model.tags.includes("embedding") && !installedIds.has(model.id),
		)
		.map((model) => ({ model, fit: computeFit({ model, hw }) }))
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
