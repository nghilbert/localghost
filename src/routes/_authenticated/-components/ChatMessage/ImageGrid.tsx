type ImageGridProps = { sources: string[] };

/** The image attachments carried on a message, rendered as bounded thumbnails. */
export function ImageGrid({ sources }: ImageGridProps) {
	return (
		<div className="flex flex-wrap gap-2" data-testid="message-image-grid">
			{sources.map((source, index) => (
				<img
					key={source}
					src={source}
					alt={`Attachment ${index + 1}`}
					className="max-h-60 max-w-[min(20rem,100%)] rounded-lg border border-border object-cover"
				/>
			))}
		</div>
	);
}
