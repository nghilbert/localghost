import { FileTextIcon } from "lucide-react";
import { Item } from "#/components/ui/item";

type DocumentListProps = { documents: Array<{ name: string; mimeType: string }> };

/** A message's document attachments, as labeled chips. */
export function DocumentList({ documents }: DocumentListProps) {
	return (
		<Item.Group aria-label="Attached documents" className="flex-row flex-wrap gap-2">
			{documents.map((document) => (
				<Item.Root
					key={`${document.name}-${document.mimeType}`}
					role="listitem"
					variant="soft"
					size="sm"
					className="w-auto max-w-60 flex-nowrap"
				>
					<Item.Media media="icon" className="text-muted-fg">
						<FileTextIcon />
					</Item.Media>
					<span className="truncate" title={document.name}>
						{document.name}
					</span>
				</Item.Root>
			))}
		</Item.Group>
	);
}
