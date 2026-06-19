import { CheckCircle2Icon } from "lucide-react";
import { FitBadge } from "#/features/library/components/ModelTable/FitBadge";
import { formatBytes } from "#/features/library/lib/format";
import type { FitScore, OllamaInstalledModel } from "#/features/library/lib/types";

/** Em-dash placeholder shown when a cell has no value. */
export function EmptyCell() {
	return <span className="text-xs text-muted-foreground">—</span>;
}

/** Green check marking a model that is installed locally. */
export function InstalledCheck() {
	return <CheckCircle2Icon size={12} className="shrink-0 text-success" />;
}

export function FamilyCell({ family }: { family?: string | null }) {
	return <span className="text-xs text-muted-foreground whitespace-nowrap">{family || "—"}</span>;
}

export function SizeCell({ installed }: { installed: OllamaInstalledModel | null }) {
	if (!installed) return <EmptyCell />;

	return (
		<span className="text-xs tabular-nums text-muted-foreground">
			{formatBytes(installed.sizeBytes)}
		</span>
	);
}

export function FitCell({ fit, hasHardware }: { fit: FitScore | null; hasHardware: boolean }) {
	if (!hasHardware || !fit) return <EmptyCell />;

	return <FitBadge tier={fit.tier} overall={fit.overall} />;
}
