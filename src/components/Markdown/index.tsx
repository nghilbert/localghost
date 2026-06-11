import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "#/components/Markdown/CodeBlock";
import { cn } from "#/lib/utils";

type MarkdownProps = {
	content: string;
	className?: string;
};

/** Renders markdown with GFM support and shiki-highlighted code blocks. */
export function Markdown({ content, className }: MarkdownProps) {
	return (
		<div
			className={cn(
				"prose prose-sm dark:prose-invert max-w-none",
				"prose-p:my-2 prose-p:leading-relaxed",
				"prose-pre:my-0 prose-pre:p-0 prose-pre:bg-transparent prose-pre:rounded-none prose-pre:border-none",
				"prose-code:before:content-none prose-code:after:content-none",
				"prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-xs prose-code:font-mono",
				"prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
				className,
			)}
		>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={{
					pre({ children }) {
						return <CodeBlock>{children}</CodeBlock>;
					},
					code({ className: codeClassName, children }) {
						if (!codeClassName) {
							return (
								<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{children}</code>
							);
						}
						return <code className={codeClassName}>{children}</code>;
					},
					a({ href, children }) {
						return (
							<a href={href} target="_blank" rel="noopener noreferrer">
								{children}
							</a>
						);
					},
				}}
			>
				{content}
			</ReactMarkdown>
		</div>
	);
}
