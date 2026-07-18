import { FileTextIcon } from "lucide-react";

type MessageDocumentListProps = { documents: Array<{ name: string; mimeType: string }> };

/** The document attachments carried on a message, rendered as labeled file chips. */
export function MessageDocumentList({ documents }: MessageDocumentListProps) {
	return (
		<div className="flex flex-wrap gap-2" data-testid="message-document-list">
			{documents.map((document) => (
				<div
					key={`${document.name}-${document.mimeType}`}
					className="flex max-w-60 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2"
				>
					<FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
					<span className="truncate text-sm" title={document.name}>
						{document.name}
					</span>
				</div>
			))}
		</div>
	);
}
