import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DocumentEditor } from "#/features/documents/components/DocumentEditor";
import { DocumentList } from "#/features/documents/components/DocumentList";
import { documentQueryOptions } from "#/features/documents/lib/document.functions";

export const Route = createFileRoute("/_authenticated/documents")({
	component: DocumentsPage,
});

function DocumentsPage() {
	const [selectedId, setSelectedId] = useState<string | undefined>();

	return (
		<div className="flex h-full">
			{/* Sidebar */}
			<aside className="w-56 shrink-0 border-r">
				<DocumentList selectedId={selectedId} onSelect={setSelectedId} />
			</aside>

			{/* Editor pane */}
			<main className="flex-1 overflow-hidden">
				{selectedId ? (
					<LoadedEditor id={selectedId} />
				) : (
					<div className="flex h-full items-center justify-center">
						<p className="text-sm text-muted-foreground">Select a document or create a new one</p>
					</div>
				)}
			</main>
		</div>
	);
}

function LoadedEditor({ id }: { id: string }) {
	const { data: doc, isLoading } = useQuery(documentQueryOptions(id));

	if (isLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<span className="text-sm text-muted-foreground">Loading…</span>
			</div>
		);
	}

	if (!doc) return null;

	return <DocumentEditor document={doc} />;
}
