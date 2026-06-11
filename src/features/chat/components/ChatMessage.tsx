import { ChevronRightIcon, TerminalIcon } from "lucide-react";
import { Markdown } from "#/components/Markdown";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "#/components/ui/collapsible";
import { SpeakButton } from "#/features/chat/components/SpeakButton";
import { cn } from "#/lib/utils";

type Props = {
	senderRole: string;
	content: string;
	isStreaming?: boolean;
	toolCalls?: Array<{ id: string; tool: string; result: string }>;
	autoSpeak?: boolean;
};

export function ChatMessage({ senderRole, content, isStreaming, toolCalls, autoSpeak }: Props) {
	const isUser = senderRole === "user";

	if (isUser) {
		return (
			<article aria-label="Your message" className="flex justify-end px-4 py-2">
				<div className="max-w-[75%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
					<p className="whitespace-pre-wrap wrap-break-word leading-relaxed">{content}</p>
				</div>
			</article>
		);
	}

	return (
		<article aria-label="Assistant message" className="group flex flex-col gap-1.5 px-4 py-3">
			<Markdown
				content={content}
				className={cn(
					isStreaming &&
						"after:ml-0.5 after:animate-pulse after:content-['▋'] after:text-muted-foreground",
				)}
			/>

			{toolCalls && toolCalls.length > 0 && (
				<div className="space-y-1.5">
					{toolCalls.map((tc) => (
						<ToolCallBlock key={tc.id} tool={tc.tool} result={tc.result} />
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

function ToolCallBlock({ tool, result }: { tool: string; result: string }) {
	return (
		<Collapsible className="overflow-hidden rounded-lg border bg-muted/30 text-xs">
			<CollapsibleTrigger className="group flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left font-medium text-muted-foreground transition-colors hover:bg-muted/50">
				<TerminalIcon size={12} className="shrink-0" />
				<span className="flex-1 font-mono">{tool}</span>
				<ChevronRightIcon
					size={12}
					className="transition-transform group-data-[state=open]:rotate-90"
				/>
			</CollapsibleTrigger>
			<CollapsibleContent>
				<pre className="max-h-56 overflow-y-auto whitespace-pre-wrap wrap-break-word border-t px-3 py-2.5 font-mono leading-relaxed text-muted-foreground">
					{result}
				</pre>
			</CollapsibleContent>
		</Collapsible>
	);
}
