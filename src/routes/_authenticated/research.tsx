import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PageHeader } from "#/components/PageHeader";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Textarea } from "#/components/ui/textarea";
import { createDocument } from "#/features/documents/lib/document.functions";
import { useResearchStream } from "#/features/research/hooks/use-research-stream";

export const Route = createFileRoute("/_authenticated/research")({
	component: ResearchPage,
});

function ResearchPage() {
	const router = useRouter();
	const [question, setQuestion] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [hasSaved, setHasSaved] = useState(false);
	const { isRunning, log, report, handleStart, handleStop } = useResearchStream();

	async function handleSave() {
		if (!report || isSaving) return;
		setIsSaving(true);
		try {
			const title = question.length > 80 ? `${question.slice(0, 77)}…` : question;
			await createDocument({ data: { title, language: "markdown", content: report } });
			setHasSaved(true);
			await router.navigate({ to: "/documents" });
		} catch (err) {
			console.error("Failed to save document:", err);
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<PageHeader
				title="Deep Research"
				description="Iterative search-and-synthesize loop powered by your configured LLM."
			/>
			<div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 overflow-auto px-4 py-6">
				<div className="flex flex-col gap-2">
					<Textarea
						value={question}
						onChange={(e) => setQuestion(e.target.value)}
						placeholder="What do you want to research?"
						rows={3}
						disabled={isRunning}
						className="resize-none"
						onKeyDown={(e) => {
							if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleStart(question);
						}}
					/>
					<div className="flex justify-end gap-2">
						{isRunning ? (
							<Button variant="outline" onClick={handleStop}>
								Stop
							</Button>
						) : (
							<Button onClick={() => handleStart(question)} disabled={!question.trim()}>
								Start Research
							</Button>
						)}
					</div>
				</div>

				{log.length > 0 && (
					<Card className="bg-muted/30">
						<CardHeader>
							<CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Progress
							</CardTitle>
						</CardHeader>
						<CardContent>
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
						</CardContent>
					</Card>
				)}

				{report && (
					<>
						<div className="flex items-center justify-between">
							<p className="text-sm font-medium">Report</p>
							{!isRunning && !hasSaved && (
								<Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
									{isSaving ? "Saving…" : "Save as Document"}
								</Button>
							)}
							{hasSaved && (
								<span className="text-xs text-muted-foreground">Saved to Documents</span>
							)}
						</div>
						<Card className="flex-1 overflow-auto">
							<CardContent className="prose prose-sm dark:prose-invert max-w-none">
								<ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
							</CardContent>
						</Card>
					</>
				)}
			</div>
		</div>
	);
}
