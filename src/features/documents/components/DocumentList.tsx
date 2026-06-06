import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileTextIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
	createDocument,
	deleteDocument,
	documentsQueryOptions,
} from "#/features/documents/lib/document.functions";
import { cn } from "#/lib/utils";

type Props = {
	selectedId?: string;
	onSelect: (id: string) => void;
};

export function DocumentList({ selectedId, onSelect }: Props) {
	const queryClient = useQueryClient();
	const { data: docs = [] } = useQuery(documentsQueryOptions());

	const createMut = useMutation({
		mutationFn: () =>
			createDocument({ data: { title: "Untitled", language: "markdown", content: "" } }),
		onSuccess: (doc) => {
			queryClient.invalidateQueries({ queryKey: ["documents"] });
			onSelect(doc.id);
		},
	});

	const deleteMut = useMutation({
		mutationFn: (id: string) => deleteDocument({ data: { id } }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
	});

	return (
		<div className="flex h-full flex-col">
			<div className="flex items-center justify-between border-b px-3 py-2">
				<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
					Documents
				</span>
				<Button
					variant="ghost"
					size="icon"
					className="h-6 w-6"
					onClick={() => createMut.mutate()}
					disabled={createMut.isPending}
					aria-label="New document"
				>
					<PlusIcon size={14} />
				</Button>
			</div>

			<ul className="flex-1 overflow-y-auto py-1">
				{docs.length === 0 && (
					<li className="px-3 py-6 text-center text-xs text-muted-foreground">No documents yet</li>
				)}
				{docs.map((doc) => (
					<li key={doc.id} className="group">
						<button
							type="button"
							className={cn(
								"flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-sidebar-accent",
								selectedId === doc.id && "bg-sidebar-accent text-sidebar-accent-foreground",
							)}
							onClick={() => onSelect(doc.id)}
						>
							<FileTextIcon size={13} className="shrink-0 text-muted-foreground" />
							<span className="flex-1 truncate text-left text-sm">{doc.title}</span>
							<Button
								variant="ghost"
								size="icon"
								className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100"
								onClick={(e) => {
									e.stopPropagation();
									deleteMut.mutate(doc.id);
								}}
								disabled={deleteMut.isPending}
								aria-label="Delete document"
							>
								<Trash2Icon size={11} />
							</Button>
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}
