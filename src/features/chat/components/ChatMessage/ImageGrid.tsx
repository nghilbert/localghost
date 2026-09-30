type ImageGridProps = { sources: string[] };

/** A message's image attachments, as thumbnails. */
export function ImageGrid({ sources }: ImageGridProps) {
	return (
		<div className="flex flex-wrap gap-2">
			{sources.map((source, index) => (
				<img
					key={source}
					src={source}
					alt={`Attachment ${index + 1}`}
					className="max-h-60 max-w-[min(20rem,100%)] rounded-lg border border-line object-cover"
				/>
			))}
		</div>
	);
}
