import { Badge } from "#/components/ui/badge";
import type { FitScore } from "#/features/cookbook/lib/types";
import { cn } from "#/lib/utils";

const TIER_LABELS: Record<FitScore["tier"], string> = {
	"gpu-optimal": "GPU",
	"gpu-tight": "GPU (tight)",
	"cpu-only": "CPU",
	"too-large": "Too large",
};

const TIER_VARIANTS: Record<FitScore["tier"], React.ComponentProps<typeof Badge>["variant"]> = {
	"gpu-optimal": "default",
	"gpu-tight": "secondary",
	"cpu-only": "outline",
	"too-large": "outline",
};

type FitBadgeProps = { tier: FitScore["tier"]; overall: number };

export function FitBadge({ tier, overall }: FitBadgeProps) {
	return (
		<div className="flex items-center gap-1.5">
			<Badge
				variant={TIER_VARIANTS[tier]}
				className={cn(
					"text-[10px]",
					tier === "too-large" && "text-muted-foreground",
					tier === "gpu-optimal" && "bg-success/10 text-success hover:bg-success/20",
					tier === "gpu-tight" && "text-warning",
				)}
			>
				{TIER_LABELS[tier]}
			</Badge>
			<span className="text-xs text-muted-foreground">{overall}</span>
		</div>
	);
}
