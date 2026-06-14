import { code } from "@streamdown/code";
import { Streamdown } from "streamdown";
import { cn } from "#/lib/utils";

type MarkdownProps = {
	content: string;
	className?: string;
};

/** Streaming-aware markdown renderer: GFM, shiki-highlighted code blocks, and graceful
 * handling of incomplete tokens while the LLM is still generating. */
export function Markdown({ content, className }: MarkdownProps) {
	return (
		<Streamdown
			plugins={{ code }}
			linkSafety={{ enabled: false }}
			className={cn("max-w-none", className)}
		>
			{content}
		</Streamdown>
	);
}
