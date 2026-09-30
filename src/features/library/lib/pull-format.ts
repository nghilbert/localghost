import { formatByteProgress, formatPercent } from "#/lib/format";
import { pullProgressPercent } from "./pull-progress";

/** The percentage and bytes of a download, or nothing until llama.cpp reports a total. */
export function formatPullDetail({
	completed,
	total,
}: {
	completed?: number;
	total?: number;
}): string | null {
	const percent = pullProgressPercent({ completed, total });
	if (percent === null || completed === undefined || total === undefined) return null;
	return `${formatPercent(percent / 100)} · ${formatByteProgress({ done: completed, total })}`;
}
