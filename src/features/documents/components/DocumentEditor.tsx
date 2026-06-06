import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import CodeMirror from "@uiw/react-codemirror";
import { SaveIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { updateDocument } from "#/features/documents/lib/document.functions";
import { cn } from "#/lib/utils";

type Document = {
	id: string;
	title: string;
	language: string;
	content: string;
	versionCount: number;
};

type Props = {
	document: Document;
	onSaved?: () => void;
};

const AUTOSAVE_DELAY = 2000;

export function DocumentEditor({ document, onSaved }: Props) {
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

	// Autosave after 2s of inactivity when content/title changes
	useEffect(() => {
		if (!dirty) return;
		const t = setTimeout(() => saveMut.mutate(undefined), AUTOSAVE_DELAY);
		return () => clearTimeout(t);
	}, [dirty, saveMut.mutate]);

	const handleContentChange = useCallback((val: string) => {
		setContent(val);
		setDirty(true);
	}, []);

	return (
		<div className="flex h-full flex-col">
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

			{/* Editor */}
			<div className="flex-1 overflow-auto">
				<CodeMirror
					value={content}
					onChange={handleContentChange}
					extensions={[
						markdown(),
						EditorView.lineWrapping,
						EditorView.theme({
							"&": { height: "100%", fontSize: "14px" },
							".cm-scroller": { fontFamily: "inherit" },
						}),
					]}
					theme={oneDark}
					height="100%"
					className="h-full"
				/>
			</div>
		</div>
	);
}
