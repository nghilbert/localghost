import { ChevronRightIcon, type LucideIcon } from "lucide-react";
import type { PropsWithChildren, ReactNode } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "#/components/ui/collapsible";
import { ScrollArea } from "#/components/ui/scroll-area";

type MessageCollapsibleProps = PropsWithChildren<{ icon: LucideIcon; label: ReactNode }>;
export function MessageCollapsible({ icon: Icon, label, children }: MessageCollapsibleProps) {
	return (
		<Collapsible className="overflow-hidden rounded-lg border bg-muted/30 text-xs">
			<CollapsibleTrigger className="group flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left font-medium text-muted-foreground transition-colors hover:bg-muted/50">
				<Icon size={12} className="shrink-0" />
				<span className="flex-1">{label}</span>
				<ChevronRightIcon
					size={12}
					className="transition-transform group-data-[state=open]:rotate-90"
				/>
			</CollapsibleTrigger>
			<CollapsibleContent>
				<ScrollArea className="max-h-56 border-t">{children}</ScrollArea>
			</CollapsibleContent>
		</Collapsible>
	);
}
