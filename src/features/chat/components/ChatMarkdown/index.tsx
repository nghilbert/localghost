import { Button as BaseButton } from "@base-ui/react/button";
import { streamingMarkdownExtension } from "@tanstack/markdown/extensions/streaming";
import {
	Markdown,
	type MarkdownComponentProps,
	type MarkdownComponents,
} from "@tanstack/markdown/react";
import { CopyIcon } from "lucide-react";
import { createElement, type JSX, useRef, useState } from "react";
import { cn } from "tailwind-variants";
import { Button } from "#/components/ui/button";
import { LinkSafetyDialog } from "#/features/chat/components/ChatMessage/LinkSafetyDialog";
import { markdownHighlighter } from "#/features/chat/lib/highlight";
import { copyToClipboard } from "#/lib/clipboard";

const streamingExtensions = [streamingMarkdownExtension()];

function styled<Tag extends keyof JSX.IntrinsicElements>({
	tag,
	className,
}: {
	tag: Tag;
	className: string;
}) {
	return function Styled(props: MarkdownComponentProps<Tag>) {
		return createElement(tag, { ...props, className: cn(className, props.className) });
	};
}

/** Opens a link only after {@link LinkSafetyDialog} shows where it goes. In-page anchors stay plain links. */
function ChatLink({ href, children, ...props }: MarkdownComponentProps<"a">) {
	const [open, setOpen] = useState(false);
	const linkClassName = "text-primary underline underline-offset-2 hover:no-underline";

	if (!href || href.startsWith("#")) {
		return (
			<a href={href} {...props} className={linkClassName}>
				{children}
			</a>
		);
	}
	return (
		<>
			<BaseButton className={cn(linkClassName, "cursor-pointer")} onClick={() => setOpen(true)}>
				{children}
			</BaseButton>
			<LinkSafetyDialog url={href} open={open} onOpenChange={setOpen} />
		</>
	);
}

function CodeBlock({
	children,
	"data-lang": lang,
	"data-code-title": title,
	...props
}: MarkdownComponentProps<"pre"> & { "data-lang"?: string; "data-code-title"?: string }) {
	const preRef = useRef<HTMLPreElement>(null);

	return (
		<div className="overflow-hidden rounded-lg border border-line bg-surface">
			<div className="flex items-center justify-between border-b border-line bg-muted py-1 pr-1 pl-3">
				<span className="font-mono text-xs text-muted-fg">
					{title ?? (!lang || lang === "plaintext" ? "text" : lang)}
				</span>
				<Button
					color="neutral"
					variant="quiet"
					size="sm"
					iconOnly
					aria-label="Copy code"
					onClick={() => copyToClipboard(preRef.current?.textContent ?? "")}
				>
					<CopyIcon />
				</Button>
			</div>
			<pre
				{...props}
				ref={preRef}
				data-lang={lang}
				className="overflow-x-auto p-3 font-mono text-[0.8125rem] leading-relaxed"
			>
				{children}
			</pre>
		</div>
	);
}

/** Styles inline code. Fenced code, which has a `language-*` class, is styled by {@link CodeBlock}. */
function Code({ className, ...props }: MarkdownComponentProps<"code">) {
	return (
		<code
			{...props}
			className={className ?? "rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.875em]"}
		/>
	);
}

function Table(props: MarkdownComponentProps<"table">) {
	return (
		<div className="overflow-x-auto">
			<table {...props} className="w-full border-collapse" />
		</div>
	);
}

const components = {
	a: ChatLink,
	pre: CodeBlock,
	// A titled fence wraps its `pre` in a figure; CodeBlock shows the title in its header instead.
	figcaption: () => null,
	code: Code,
	table: Table,
	h1: styled({ tag: "h1", className: "text-xl font-semibold" }),
	h2: styled({ tag: "h2", className: "text-lg font-semibold" }),
	h3: styled({ tag: "h3", className: "text-base font-semibold" }),
	h4: styled({ tag: "h4", className: "font-semibold" }),
	h5: styled({ tag: "h5", className: "font-semibold" }),
	h6: styled({ tag: "h6", className: "font-semibold text-muted-fg" }),
	ul: styled({ tag: "ul", className: "list-disc space-y-1 pl-6" }),
	ol: styled({ tag: "ol", className: "list-decimal space-y-1 pl-6" }),
	li: styled({ tag: "li", className: "*:[ol,ul]:mt-1" }),
	blockquote: styled({
		tag: "blockquote",
		className: "flex flex-col gap-3 border-l-2 border-line pl-4 text-muted-fg",
	}),
	hr: styled({ tag: "hr", className: "border-line" }),
	th: styled({
		tag: "th",
		className: "border border-line bg-muted px-3 py-1.5 text-left font-semibold",
	}),
	td: styled({ tag: "td", className: "border border-line px-3 py-1.5" }),
	img: styled({ tag: "img", className: "max-w-full rounded-md" }),
} satisfies MarkdownComponents;

type ChatMarkdownProps = {
	children: string;
	/** Hides half-written trailing blocks, such as an empty list item, while the text streams. */
	isStreaming?: boolean;
	/** Draws a block caret after the last block. */
	caret?: boolean;
	className?: string;
};

/** Model output rendered as Markdown, with raw HTML left as text. */
export function ChatMarkdown({ children, isStreaming, caret, className }: ChatMarkdownProps) {
	return (
		<div
			className={cn(
				"flex flex-col gap-3 wrap-break-word",
				caret && "*:last:after:ml-0.5 *:last:after:animate-pulse *:last:after:content-['▋']",
				className,
			)}
		>
			<Markdown
				components={components}
				highlighter={markdownHighlighter}
				codeLineNumbers
				extensions={isStreaming ? streamingExtensions : undefined}
			>
				{children}
			</Markdown>
		</div>
	);
}
