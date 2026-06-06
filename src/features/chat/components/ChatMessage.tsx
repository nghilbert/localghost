import { CheckIcon, ChevronDownIcon, ChevronRightIcon, CopyIcon, TerminalIcon } from "lucide-react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "#/components/ui/button";
import { highlight } from "#/lib/highlighter";
import { cn } from "#/lib/utils";

type Props = {
	senderRole: string;
	content: string;
	isStreaming?: boolean;
	toolCalls?: Array<{ id: string; tool: string; result: string }>;
};

export function ChatMessage({ senderRole, content, isStreaming, toolCalls }: Props) {
	const isUser = senderRole === "user";

	if (isUser) {
		return (
			<article aria-label="Your message" className="flex justify-end px-4 py-2">
				<div className="max-w-[75%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
					<p className="whitespace-pre-wrap break-words leading-relaxed">{content}</p>
				</div>
			</article>
		);
	}

	return (
		<article aria-label="Assistant message" className="flex flex-col gap-1.5 px-4 py-3">
			<div
				className={cn(
					"prose prose-sm dark:prose-invert max-w-none",
					"prose-p:my-2 prose-p:leading-relaxed",
					"prose-pre:my-0 prose-pre:p-0 prose-pre:bg-transparent prose-pre:rounded-none prose-pre:border-none",
					"prose-code:before:content-none prose-code:after:content-none",
					"prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-xs prose-code:font-mono",
					"prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
					isStreaming &&
						"after:ml-0.5 after:animate-pulse after:content-['▋'] after:text-muted-foreground",
				)}
			>
				<ReactMarkdown
					remarkPlugins={[remarkGfm]}
					components={{
						pre({ children }) {
							return <CodeBlock>{children}</CodeBlock>;
						},
						code({ className, children }) {
							if (!className) {
								return (
									<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
										{children}
									</code>
								);
							}
							return <code className={className}>{children}</code>;
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

			{toolCalls && toolCalls.length > 0 && (
				<div className="space-y-1.5">
					{toolCalls.map((tc) => (
						<ToolCallBlock key={tc.id} tool={tc.tool} result={tc.result} />
					))}
				</div>
			)}
		</article>
	);
}

function extractCodeAndLang(children: React.ReactNode): { code: string; lang: string } {
	let lang = "text";
	let code = "";

	function walk(node: React.ReactNode) {
		if (typeof node === "string") {
			code += node;
		} else if (typeof node === "number") {
			code += String(node);
		} else if (Array.isArray(node)) {
			node.forEach(walk);
		} else if (node && typeof node === "object" && "props" in (node as object)) {
			const el = node as React.ReactElement<{ className?: string; children?: React.ReactNode }>;
			const match = el.props.className?.match(/language-(\w+)/);
			if (match?.[1]) lang = match[1];
			walk(el.props.children);
		}
	}

	walk(children);
	return { code: code.trimEnd(), lang };
}

function CodeBlock({ children }: { children: React.ReactNode }) {
	const { code, lang } = extractCodeAndLang(children);
	const [html, setHtml] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		let cancelled = false;
		highlight(code, lang).then((result) => {
			if (!cancelled) setHtml(result);
		});
		return () => {
			cancelled = true;
		};
	}, [code, lang]);

	async function handleCopy() {
		await navigator.clipboard.writeText(code);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	return (
		<div className="group relative my-3 overflow-hidden rounded-xl border border-border bg-muted/40">
			<div className="flex items-center justify-between border-b border-border bg-muted/60 px-4 py-1.5">
				<span className="font-mono text-xs text-muted-foreground">{lang}</span>
				<Button
					variant="ghost"
					size="icon"
					className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
					onClick={handleCopy}
					aria-label="Copy code"
				>
					{copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
				</Button>
			</div>
			{html ? (
				<div
					className="overflow-x-auto [&>pre]:m-0 [&>pre]:rounded-none [&>pre]:border-none [&>pre]:bg-transparent [&>pre]:p-4 [&>pre]:text-sm [&>pre]:leading-relaxed"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: shiki output is sanitised HTML
					dangerouslySetInnerHTML={{ __html: html }}
				/>
			) : (
				<pre className="overflow-x-auto p-4 text-sm leading-relaxed">
					<code>{code}</code>
				</pre>
			)}
		</div>
	);
}

function ToolCallBlock({ tool, result }: { tool: string; result: string }) {
	const [expanded, setExpanded] = useState(false);

	return (
		<div className="overflow-hidden rounded-lg border bg-muted/30 text-xs">
			<button
				type="button"
				className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left font-medium text-muted-foreground transition-colors hover:bg-muted/50"
				onClick={() => setExpanded((v) => !v)}
			>
				<TerminalIcon size={12} className="shrink-0" />
				<span className="flex-1 font-mono">{tool}</span>
				{expanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
			</button>
			{expanded && (
				<pre className="max-h-56 overflow-y-auto whitespace-pre-wrap break-words border-t px-3 py-2.5 font-mono leading-relaxed text-muted-foreground">
					{result}
				</pre>
			)}
		</div>
	);
}
