import { FileTextIcon, XIcon } from "lucide-react";
import type { Attachment } from "#/routes/_authenticated/-lib/attachments";
import { Button } from "#/shared/components/ui/button";

type AttachmentPreviewsProps = {
	attachments: Attachment[];
	onRemove: (id: string) => void;
};

/** Staged composer attachments: image thumbnails and document chips, each removable. */
export function AttachmentPreviews({ attachments, onRemove }: AttachmentPreviewsProps) {
	if (attachments.length === 0) return null;
	return (
		<div className="flex flex-wrap gap-2" data-testid="attachment-previews">
			{attachments.map((attachment) => (
				<div key={attachment.id} className="group/attachment relative">
					{attachment.kind === "image" ? (
						<img
							src={attachment.dataUrl}
							alt={attachment.name}
							className="size-14 rounded-md border border-border object-cover"
						/>
					) : (
						<div
							className="flex h-14 max-w-40 items-center gap-2 rounded-md border border-border bg-muted/40 px-3"
							data-testid="document-chip"
						>
							<FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
							<span className="truncate text-xs" title={attachment.name}>
								{attachment.name}
							</span>
						</div>
					)}
					<Button
						type="button"
						variant="secondary"
						size="icon-sm"
						aria-label={`Remove ${attachment.name}`}
						data-testid="remove-attachment"
						className="absolute -top-1.5 -right-1.5 size-5 rounded-full opacity-0 shadow-sm transition-opacity group-hover/attachment:opacity-100 focus-visible:opacity-100"
						onClick={() => onRemove(attachment.id)}
					>
						<XIcon className="size-3" />
					</Button>
				</div>
			))}
		</div>
	);
}
