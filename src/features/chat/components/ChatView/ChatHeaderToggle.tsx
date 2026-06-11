import { Button } from "#/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { cn } from "#/lib/utils";

type ChatHeaderToggleProps = {
	icon: React.ReactNode;
	isActive: boolean;
	activeLabel: string;
	inactiveLabel: string;
	onToggle: () => void;
};

export function ChatHeaderToggle({
	icon,
	isActive,
	activeLabel,
	inactiveLabel,
	onToggle,
}: ChatHeaderToggleProps) {
	const label = isActive ? activeLabel : inactiveLabel;

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					onClick={onToggle}
					className={cn(
						"h-7 gap-1 px-2 text-xs",
						isActive ? "bg-primary/10 text-primary" : "text-muted-foreground",
					)}
					aria-label={label}
				>
					{icon}
				</Button>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}
