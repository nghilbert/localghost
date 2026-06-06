import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { DownloadIcon, ImageIcon, TrashIcon, UploadCloudIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "#/components/PageHeader";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/_authenticated/gallery")({
	component: GalleryPage,
});

type GalleryItem = { path: string; name: string };

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"]);
function isImage(name: string) {
	const ext = name.split(".").pop()?.toLowerCase() ?? "";
	return IMAGE_EXTS.has(ext);
}

const galleryQueryOptions = {
	queryKey: ["gallery"],
	queryFn: async (): Promise<GalleryItem[]> => {
		const res = await fetch("/api/gallery/upload");
		if (!res.ok) return [];
		return res.json() as Promise<GalleryItem[]>;
	},
};

function GalleryPage() {
	const queryClient = useQueryClient();
	const { data: items = [] } = useQuery(galleryQueryOptions);
	const inputRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);
	const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
	const [dragOver, setDragOver] = useState(false);

	const imageItems = items.filter((i) => isImage(i.name));
	const lightboxItem = lightboxIdx !== null ? (imageItems[lightboxIdx] ?? null) : null;

	const uploadFiles = async (files: FileList | File[]) => {
		setUploading(true);
		let ok = 0;
		for (const file of Array.from(files)) {
			const fd = new FormData();
			fd.append("file", file);
			try {
				const res = await fetch("/api/gallery/upload", { method: "POST", body: fd });
				if (res.ok) {
					ok++;
					await queryClient.invalidateQueries({ queryKey: ["gallery"] });
				}
			} catch {
				// skip failed uploads
			}
		}
		setUploading(false);
		if (ok > 0) toast.success(`Uploaded ${ok} file${ok !== 1 ? "s" : ""}`);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setDragOver(false);
		if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
	};

	const removeItem = async (path: string) => {
		await fetch("/api/gallery/upload", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ path }),
		});
		await queryClient.invalidateQueries({ queryKey: ["gallery"] });
		toast.success("File removed");
	};

	const handleKey = (e: React.KeyboardEvent) => {
		if (!lightboxItem) return;
		if (e.key === "Escape") setLightboxIdx(null);
		if (e.key === "ArrowRight")
			setLightboxIdx((i) => (i !== null ? Math.min(i + 1, imageItems.length - 1) : null));
		if (e.key === "ArrowLeft") setLightboxIdx((i) => (i !== null ? Math.max(i - 1, 0) : null));
	};

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<PageHeader
				title="Gallery"
				description={`${items.length} file${items.length !== 1 ? "s" : ""}`}
				actions={
					<>
						<Button
							size="sm"
							variant="outline"
							className="gap-1.5"
							onClick={() => inputRef.current?.click()}
							disabled={uploading}
						>
							<UploadCloudIcon size={14} />
							{uploading ? "Uploading…" : "Upload"}
						</Button>
						<input
							ref={inputRef}
							type="file"
							multiple
							accept="image/*,video/*,.pdf,.txt,.md"
							className="hidden"
							onChange={(e) => e.target.files?.length && uploadFiles(e.target.files)}
							aria-label="Upload files"
						/>
					</>
				}
			/>

			<section
				className={cn(
					"flex-1 overflow-auto p-4 transition-colors",
					dragOver && "bg-primary/5 ring-2 ring-inset ring-primary/30",
				)}
				onDragOver={(e) => {
					e.preventDefault();
					setDragOver(true);
				}}
				onDragLeave={() => setDragOver(false)}
				onDrop={handleDrop}
				aria-label="File drop zone"
			>
				{items.length === 0 && (
					<div className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-border">
						<div className="flex size-16 items-center justify-center rounded-full bg-muted">
							<UploadCloudIcon size={24} className="text-muted-foreground" />
						</div>
						<div className="text-center">
							<p className="text-sm font-medium">Drop files here</p>
							<p className="text-xs text-muted-foreground">or click Upload above</p>
						</div>
					</div>
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
											onClick={() => setLightboxIdx(imgIdx)}
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
											onClick={() => removeItem(item.path)}
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

			{/* Lightbox */}
			{lightboxItem && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
					onClick={() => setLightboxIdx(null)}
					onKeyDown={handleKey}
					role="dialog"
					aria-label="Image preview"
					aria-modal="true"
					tabIndex={-1}
				>
					<button
						type="button"
						onClick={() => setLightboxIdx(null)}
						className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
						aria-label="Close preview"
					>
						<XIcon size={16} />
					</button>
					{lightboxIdx !== null && lightboxIdx > 0 && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								setLightboxIdx((i) => (i !== null ? i - 1 : null));
							}}
							className="absolute left-4 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
							aria-label="Previous"
						>
							‹
						</button>
					)}
					{lightboxIdx !== null && lightboxIdx < imageItems.length - 1 && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								setLightboxIdx((i) => (i !== null ? i + 1 : null));
							}}
							className="absolute right-4 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
							aria-label="Next"
						>
							›
						</button>
					)}
					<img
						src={lightboxItem.path}
						alt={lightboxItem.name}
						className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
					/>
					<p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white/80 backdrop-blur-sm">
						{lightboxItem.name}
					</p>
				</div>
			)}
		</div>
	);
}
