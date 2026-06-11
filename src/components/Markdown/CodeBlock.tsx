import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import { highlight } from "#/lib/highlighter";

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

export function CodeBlock({ children }: { children: React.ReactNode }) {
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
