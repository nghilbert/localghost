import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { useState } from "react";
import { DocumentEditor } from "#/features/documents/components/DocumentEditor";
import { DocumentList } from "#/features/documents/components/DocumentList";
import { documentQueryOptions } from "#/features/documents/lib/document.functions";

export const Route = createFileRoute("/_authenticated/documents")({
	component: DocumentsPage,
});

function DocumentsPage() {
	const [selectedId, setSelectedId] = useState<string | undefined>();
	const showEditor = !!selectedId;

	return (
		<div className="flex h-full overflow-hidden">
			{/* Document list sidebar */}
			<aside
				className={`flex-col border-r md:flex md:w-56 md:shrink-0 ${showEditor ? "hidden" : "flex w-full"}`}
			>
				<DocumentList selectedId={selectedId} onSelect={setSelectedId} />
			</aside>

			{/* Editor pane */}
			<main
				className={`flex flex-1 flex-col overflow-hidden ${showEditor ? "flex" : "hidden md:flex"}`}
			>
				{selectedId ? (
					<LoadedEditor id={selectedId} onBack={() => setSelectedId(undefined)} />
				) : (
					<div className="flex h-full items-center justify-center">
						<p className="text-sm text-muted-foreground">Select a document or create a new one</p>
					</div>
				)}
			</main>
		</div>
	);
}

function LoadedEditor({ id, onBack }: { id: string; onBack: () => void }) {
	const { data: doc, isLoading } = useQuery(documentQueryOptions(id));

	if (isLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<span className="text-sm text-muted-foreground">Loading…</span>
			</div>
		);
	}

	if (!doc) return null;

	return (
		<div className="flex h-full flex-col overflow-hidden">
			{/* Back button — mobile only */}
			<div className="border-b px-3 py-2 md:hidden">
				<button
					type="button"
					className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
					onClick={onBack}
				>
					<ArrowLeftIcon size={13} />
					Documents
				</button>
			</div>
			<div className="min-h-0 flex-1 overflow-hidden">
				<DocumentEditor document={doc} />
			</div>
		</div>
	);
}
