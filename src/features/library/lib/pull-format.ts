import { formatByteProgress } from "#/lib/format";
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
	return `${Math.floor(percent)}% · ${formatByteProgress({ done: completed, total })}`;
}
