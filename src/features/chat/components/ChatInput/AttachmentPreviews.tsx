import { FileTextIcon, XIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Item } from "#/components/ui/item";
import type { Attachment } from "#/features/chat/lib/attachments";

type AttachmentPreviewsProps = {
	attachments: Attachment[];
	onRemove: (id: string) => void;
};

/** The attachments waiting to be sent, each removable. */
export function AttachmentPreviews({ attachments, onRemove }: AttachmentPreviewsProps) {
	if (attachments.length === 0) return null;
	return (
		<ul aria-label="Attachments" className="flex flex-wrap gap-2">
			{attachments.map((attachment) => (
				<li key={attachment.id} className="group/attachment relative">
					{attachment.kind === "image" ? (
						<img
							src={attachment.dataUrl}
							alt={attachment.name}
							className="size-14 rounded-md border border-line object-cover"
						/>
					) : (
						<Item.Root
							variant="soft"
							size="sm"
							className="h-14 w-auto max-w-40 flex-nowrap text-xs"
						>
							<Item.Media media="icon" className="text-muted-fg">
								<FileTextIcon />
							</Item.Media>
							<span className="truncate" title={attachment.name}>
								{attachment.name}
							</span>
						</Item.Root>
					)}
					<Button
						color="neutral"
						variant="soft"
						size="sm"
						iconOnly
						aria-label={`Remove ${attachment.name}`}
						className="absolute -top-1.5 -right-1.5 size-5 rounded-full opacity-0 shadow-sm transition-opacity group-hover/attachment:opacity-100 focus-visible:opacity-100"
						onClick={() => onRemove(attachment.id)}
					>
						<XIcon className="size-3" />
					</Button>
				</li>
			))}
		</ul>
	);
}
