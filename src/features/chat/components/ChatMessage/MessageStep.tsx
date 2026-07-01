import { ChevronRightIcon, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "#/components/ui/collapsible";

type MessageStepProps = {
	icon: LucideIcon;
	title: ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	children: ReactNode;
};

/**
 * A collapsed step inside an assistant message — a resolved tool call or a
 * reasoning trace. Uncontrolled (default closed) unless `open`/`onOpenChange`
 * are supplied.
 */
export function MessageStep({ icon: Icon, title, open, onOpenChange, children }: MessageStepProps) {
	return (
		<Collapsible
			open={open}
			onOpenChange={onOpenChange}
			className="overflow-hidden rounded-lg border bg-muted/30 text-xs"
		>
			<CollapsibleTrigger className="group flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left font-medium text-muted-foreground transition-colors hover:bg-muted/50">
				<Icon size={12} className="shrink-0" />
				<span className="flex-1">{title}</span>
				<ChevronRightIcon
					size={12}
					className="transition-transform group-data-[state=open]:rotate-90"
				/>
			</CollapsibleTrigger>
			<CollapsibleContent>{children}</CollapsibleContent>
		</Collapsible>
	);
}
