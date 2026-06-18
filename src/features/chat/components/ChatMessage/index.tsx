import type { UIMessage } from "@tanstack/ai-client";
import { BrainIcon, ChevronRightIcon, TerminalIcon } from "lucide-react";
import { Markdown } from "#/components/Markdown";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "#/components/ui/collapsible";
import { ScrollArea } from "#/components/ui/scroll-area";
import { SpeakButton } from "#/features/chat/components/ChatMessage/SpeakButton";
import { partsText } from "#/features/chat/lib/message-text";
import { cn } from "#/lib/utils";

type Props = {
	message: UIMessage;
	isStreaming?: boolean;
	autoSpeak?: boolean;
};

export function ChatMessage({ message, isStreaming, autoSpeak }: Props) {
	const content = partsText(message.parts);

	if (message.role === "user") {
		return (
			<article aria-label="Your message" className="flex justify-end px-4 py-2">
				<div className="max-w-[75%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
					<p className="whitespace-pre-wrap wrap-break-word leading-relaxed">{content}</p>
				</div>
			</article>
		);
	}

	const reasoning = message.parts
		.filter((p) => p.type === "thinking")
		.map((p) => p.content)
		.join("\n");

	const toolCalls = message.parts.filter((p) => p.type === "tool-call");

	return (
		<article aria-label="Assistant message" className="group flex flex-col gap-1.5 px-4 py-3">
			{reasoning && (
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
								{reasoning}
							</p>
						</ScrollArea>
					</CollapsibleContent>
				</Collapsible>
			)}

			<Markdown
				content={content}
				className={cn(
					isStreaming &&
						"after:ml-0.5 after:animate-pulse after:content-['▋'] after:text-muted-foreground",
				)}
			/>

			{toolCalls.length > 0 && (
				<div className="space-y-1.5">
					{toolCalls.map((tc) => (
						<Collapsible
							key={tc.id}
							className="overflow-hidden rounded-lg border bg-muted/30 text-xs"
						>
							<CollapsibleTrigger className="group flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left font-medium text-muted-foreground transition-colors hover:bg-muted/50">
								<TerminalIcon size={12} className="shrink-0" />
								<span className="flex-1 font-mono">{tc.name}</span>
								<ChevronRightIcon
									size={12}
									className="transition-transform group-data-[state=open]:rotate-90"
								/>
							</CollapsibleTrigger>
							<CollapsibleContent>
								<ScrollArea className="max-h-56 border-t">
									<pre className="whitespace-pre-wrap wrap-break-word px-3 py-2.5 font-mono leading-relaxed text-muted-foreground">
										{tc.output == null
											? ""
											: typeof tc.output === "string"
												? tc.output
												: JSON.stringify(tc.output, null, 2)}
									</pre>
								</ScrollArea>
							</CollapsibleContent>
						</Collapsible>
					))}
				</div>
			)}

			{!isStreaming && content && (
				<div className="flex items-center gap-1">
					<SpeakButton text={content} autoPlay={autoSpeak} />
				</div>
			)}
		</article>
	);
}
