import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Markdown } from "@tiptap/markdown";
import { Tiptap, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { SaveIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Skeleton } from "#/components/ui/skeleton";
import { updateDocument } from "#/features/documents/lib/document.functions";
import { cn } from "#/lib/utils";

type DocumentEditorProps = {
	document: {
		id: string;
		title: string;
		language: string;
		content: string;
		versionCount: number;
	};
	onSaved?: () => void;
};

export function DocumentEditor({ document, onSaved }: DocumentEditorProps) {
	const queryClient = useQueryClient();
	const [title, setTitle] = useState(document.title);
	const [content, setContent] = useState(document.content);
	const [dirty, setDirty] = useState(false);
	const [lastSaved, setLastSaved] = useState<Date | null>(null);

	const saveMut = useMutation({
		mutationFn: (summary?: string) =>
			updateDocument({
				data: {
					id: document.id,
					title,
					content,
					summary: summary ?? `v${document.versionCount + 1}`,
				},
			}),
		onSuccess: () => {
			setDirty(false);
			setLastSaved(new Date());
			queryClient.invalidateQueries({ queryKey: ["document", document.id] });
			queryClient.invalidateQueries({ queryKey: ["documents"] });
			onSaved?.();
		},
	});

	const editor = useEditor({
		extensions: [StarterKit, Markdown],
		content: document.content,
		contentType: "markdown",
		immediatelyRender: false,
		onUpdate: ({ editor }) => {
			setContent(editor.getMarkdown());
			setDirty(true);
		},
	});
	if (!editor) return <Skeleton className="w-full h-full" />;

	return (
		<Tiptap editor={editor}>
			{/* Title bar */}
			<div className="flex items-center gap-2 border-b px-4 py-2">
				<Input
					value={title}
					onChange={(e) => {
						setTitle(e.target.value);
						setDirty(true);
					}}
					className="h-7 border-none bg-transparent px-0 text-sm font-medium shadow-none focus-visible:ring-0"
					placeholder="Untitled"
				/>
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					{dirty && !saveMut.isPending && <span>Unsaved</span>}
					{saveMut.isPending && <span>Saving…</span>}
					{!dirty && lastSaved && (
						<span>Saved {lastSaved.toLocaleTimeString([], { timeStyle: "short" })}</span>
					)}
				</div>
				<Button
					size="sm"
					variant="outline"
					onClick={() => saveMut.mutate("Manual save")}
					disabled={saveMut.isPending || !dirty}
					className={cn("gap-1", dirty && "border-primary text-primary")}
				>
					<SaveIcon size={13} />
					Save
				</Button>
			</div>

			<Tiptap.Content />
		</Tiptap>
	);
}
