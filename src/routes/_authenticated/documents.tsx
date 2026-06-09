import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Skeleton } from "#/components/ui/skeleton";
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
	const documentQuery = useQuery(documentQueryOptions(id));

	if (documentQuery.isLoading) return <Skeleton className="w-full h-full" />;
	if (documentQuery.isError)
		return <div className="p-4 text-destructive">{documentQuery.error?.message}</div>;
	if (!documentQuery.isSuccess)
		return <div className="p-4 text-destructive">Something went wrong</div>;

	return <DocumentEditor document={documentQuery.data} />;
}
