import { DownloadIcon, ImageIcon, TrashIcon, UploadCloudIcon } from "lucide-react";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/ui/empty";
import { cn } from "#/lib/utils";
import { type GalleryItem, isImage } from "../lib/types";

type GalleryGridProps = {
	items: GalleryItem[];
	isDragOver: boolean;
	onDragOver: (e: React.DragEvent) => void;
	onDragLeave: () => void;
	onDrop: (e: React.DragEvent) => void;
	onPreview: (idx: number) => void;
	onRemove: (path: string) => void;
};

export function GalleryGrid({
	items,
	isDragOver,
	onDragOver,
	onDragLeave,
	onDrop,
	onPreview,
	onRemove,
}: GalleryGridProps) {
	const imageItems = items.filter((i) => isImage(i.name));

	return (
		<section
			className={cn(
				"flex-1 overflow-auto p-4 transition-colors",
				isDragOver && "bg-primary/5 ring-2 ring-inset ring-primary/30",
			)}
			onDragOver={onDragOver}
			onDragLeave={onDragLeave}
			onDrop={onDrop}
			aria-label="File drop zone"
		>
			{items.length === 0 && (
				<Empty className="h-full border-2">
					<EmptyHeader>
						<EmptyMedia>
							<UploadCloudIcon size={24} className="text-muted-foreground" />
						</EmptyMedia>
						<EmptyTitle>Drop files here</EmptyTitle>
						<EmptyDescription>or click Upload above</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)}

			{items.length > 0 && (
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
					{items.map((item) => {
						const imgIdx = imageItems.indexOf(item);
						return (
							<div
								key={item.path}
								className="group relative overflow-hidden rounded-xl border bg-muted/20"
							>
								{isImage(item.name) ? (
									<button
										type="button"
										className="block w-full"
										onClick={() => onPreview(imgIdx)}
										aria-label={`View ${item.name}`}
									>
										<img
											src={item.path}
											alt={item.name}
											className="aspect-square w-full object-cover transition-transform duration-200 group-hover:scale-105"
											loading="lazy"
										/>
									</button>
								) : (
									<div className="flex aspect-square items-center justify-center bg-muted/30">
										<ImageIcon size={24} className="text-muted-foreground/40" />
									</div>
								)}
								<div className="border-t px-2 py-1.5">
									<p className="truncate text-xs text-muted-foreground">{item.name}</p>
								</div>
								<div className="absolute right-1.5 top-1.5 hidden gap-1 group-hover:flex">
									<a
										href={item.path}
										download={item.name}
										className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur-sm hover:bg-black/80"
										aria-label={`Download ${item.name}`}
									>
										<DownloadIcon size={12} />
									</a>
									<button
										type="button"
										onClick={() => onRemove(item.path)}
										className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur-sm hover:bg-destructive"
										aria-label={`Remove ${item.name}`}
									>
										<TrashIcon size={12} />
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</section>
	);
}
