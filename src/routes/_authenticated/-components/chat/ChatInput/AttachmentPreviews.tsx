import { XIcon } from "lucide-react";
import type { ImageAttachment } from "#/routes/_authenticated/-lib/attachments";
import { Button } from "#/shared/components/ui/button";

type AttachmentPreviewsProps = {
	attachments: ImageAttachment[];
	onRemove: (id: string) => void;
};

/** Thumbnail chips for the composer's staged image attachments, each removable. */
export function AttachmentPreviews({ attachments, onRemove }: AttachmentPreviewsProps) {
	if (attachments.length === 0) return null;
	return (
		<div className="flex flex-wrap gap-2" data-testid="attachment-previews">
			{attachments.map((attachment) => (
				<div key={attachment.id} className="group/attachment relative">
					<img
						src={attachment.dataUrl}
						alt={attachment.name}
						className="size-14 rounded-md border border-border object-cover"
					/>
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
