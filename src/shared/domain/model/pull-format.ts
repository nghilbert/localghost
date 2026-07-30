import { pullProgressPercent } from "#/shared/domain/model/pull-progress";
import { formatBytes } from "#/shared/lib/format";

/** One-line percentage and byte detail, omitted until llama.cpp reports a usable total. */
export function formatPullDetail({
	completed,
	total,
}: {
	completed?: number;
	total?: number;
}): string | null {
	const percent = pullProgressPercent({ completed, total });
	if (percent === null || completed === undefined || total === undefined) return null;
	return `${Math.round(percent)}% · ${formatBytes(completed)} / ${formatBytes(total)}`;
}
