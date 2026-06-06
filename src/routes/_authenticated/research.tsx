import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "#/components/ui/button";
import { Textarea } from "#/components/ui/textarea";
import { createDocument } from "#/features/documents/lib/document.functions";

export const Route = createFileRoute("/_authenticated/research")({
	component: ResearchPage,
});

type LogLine = { id: number; text: string };

function ResearchPage() {
	const router = useRouter();
	const [question, setQuestion] = useState("");
	const [isRunning, setIsRunning] = useState(false);
	const [log, setLog] = useState<LogLine[]>([]);
	const [report, setReport] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [savedId, setSavedId] = useState<string | null>(null);
	const abortRef = useRef<AbortController | null>(null);
	const logIdRef = useRef(0);

	function addLog(text: string) {
		setLog((prev) => [...prev, { id: ++logIdRef.current, text }]);
	}

	async function handleStart() {
		if (!question.trim() || isRunning) return;

		setIsRunning(true);
		setLog([]);
		setReport("");

		const abort = new AbortController();
		abortRef.current = abort;

		try {
			const response = await fetch("/api/research/stream", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ question }),
				signal: abort.signal,
			});

			if (!response.ok) {
				const msg = await response.text().catch(() => "");
				throw new Error(msg || `HTTP ${response.status}`);
			}
			if (!response.body) throw new Error("No response body");

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() ?? "";

				for (const line of lines) {
					if (!line.startsWith("data: ")) continue;
					const raw = line.slice(6).trim();
					if (!raw) continue;
					try {
						const evt = JSON.parse(raw) as {
							type: string;
							message?: string;
							content?: string;
							error?: string;
						};

						if (evt.type === "progress" && evt.message) {
							addLog(evt.message);
						} else if (evt.type === "report" && evt.content) {
							setReport((prev) => prev + evt.content);
						} else if (evt.type === "error") {
							addLog(`Error: ${evt.error ?? "Unknown error"}`);
						}
					} catch {
						// skip malformed
					}
				}
			}
		} catch (err) {
			if ((err as Error).name !== "AbortError") {
				addLog(`Stream error: ${(err as Error).message}`);
			}
		} finally {
			setIsRunning(false);
			abortRef.current = null;
		}
	}

	function handleStop() {
		abortRef.current?.abort();
	}

	async function handleSave() {
		if (!report || isSaving) return;
		setIsSaving(true);
		try {
			const title = question.length > 80 ? `${question.slice(0, 77)}…` : question;
			const doc = await createDocument({ data: { title, language: "markdown", content: report } });
			setSavedId(doc.id);
			await router.navigate({ to: "/documents" });
		} catch (err) {
			console.error("Failed to save document:", err);
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<div className="mx-auto flex h-full max-w-4xl flex-col gap-4 px-4 py-6">
			<div>
				<h1 className="text-lg font-semibold">Deep Research</h1>
				<p className="text-sm text-muted-foreground">
					Iterative search-and-synthesize loop powered by your configured LLM.
				</p>
			</div>

			{/* Question input */}
			<div className="flex flex-col gap-2">
				<Textarea
					value={question}
					onChange={(e) => setQuestion(e.target.value)}
					placeholder="What do you want to research?"
					rows={3}
					disabled={isRunning}
					className="resize-none"
					onKeyDown={(e) => {
						if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleStart();
					}}
				/>
				<div className="flex justify-end gap-2">
					{isRunning ? (
						<Button variant="outline" onClick={handleStop}>
							Stop
						</Button>
					) : (
						<Button onClick={handleStart} disabled={!question.trim()}>
							Start Research
						</Button>
					)}
				</div>
			</div>

			{/* Progress log */}
			{log.length > 0 && (
				<div className="rounded-lg border bg-muted/30 px-4 py-3">
					<p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
						Progress
					</p>
					<ul className="space-y-0.5">
						{log.map((l) => (
							<li key={l.id} className="flex items-start gap-2 text-sm">
								<span className="mt-0.5 text-muted-foreground">›</span>
								<span>{l.text}</span>
							</li>
						))}
						{isRunning && (
							<li className="flex items-center gap-2 text-sm text-muted-foreground">
								<span className="mt-0.5">›</span>
								<span className="animate-pulse">Working…</span>
							</li>
						)}
					</ul>
				</div>
			)}

			{/* Report output */}
			{report && (
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<p className="text-sm font-medium">Report</p>
						{!isRunning && !savedId && (
							<Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
								{isSaving ? "Saving…" : "Save as Document"}
							</Button>
						)}
						{savedId && <span className="text-xs text-muted-foreground">Saved to Documents</span>}
					</div>
					<div className="flex-1 overflow-auto rounded-lg border bg-background p-6">
						<div className="prose prose-sm dark:prose-invert max-w-none">
							<ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
