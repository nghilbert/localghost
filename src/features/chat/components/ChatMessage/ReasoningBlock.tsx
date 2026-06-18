import { BrainIcon, ChevronRightIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "#/components/ui/collapsible";
import { ScrollArea } from "#/components/ui/scroll-area";

export function ReasoningBlock({ content }: { content: string }) {
	return (
		<Collapsible className="overflow-hidden rounded-lg border bg-muted/30 text-xs">
			<CollapsibleTrigger className="group flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left font-medium text-muted-foreground transition-colors hover:bg-muted/50">
				<BrainIcon size={12} className="shrink-0" />
				<span className="flex-1">Reasoning</span>
				<ChevronRightIcon
					size={12}
					className="transition-transform group-data-[state=open]:rotate-90"
				/>
			</CollapsibleTrigger>
			<CollapsibleContent>
				<ScrollArea className="max-h-56 border-t">
					<p className="whitespace-pre-wrap wrap-break-word px-3 py-2.5 leading-relaxed text-muted-foreground">
						{content}
					</p>
				</ScrollArea>
			</CollapsibleContent>
		</Collapsible>
	);
}
