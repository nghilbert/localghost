import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { DownloadIcon, TrashIcon, UploadIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
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
	const [lightbox, setLightbox] = useState<GalleryItem | null>(null);
	const [dragOver, setDragOver] = useState(false);

	const uploadFiles = async (files: FileList | File[]) => {
		setUploading(true);
		for (const file of Array.from(files)) {
			const fd = new FormData();
			fd.append("file", file);
			try {
				const res = await fetch("/api/gallery/upload", { method: "POST", body: fd });
				if (res.ok) await queryClient.invalidateQueries({ queryKey: ["gallery"] });
			} catch {
				// skip failed uploads
			}
		}
		setUploading(false);
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files?.length) uploadFiles(e.target.files);
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
		queryClient.invalidateQueries({ queryKey: ["gallery"] });
	};

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<div className="border-b p-4 flex items-center gap-3">
				<h1 className="text-sm font-semibold">Gallery</h1>
				<span className="text-xs text-muted-foreground">
					{items.length} file{items.length !== 1 ? "s" : ""}
				</span>
				<Button
					size="sm"
					variant="outline"
					className="ml-auto gap-1"
					onClick={() => inputRef.current?.click()}
					disabled={uploading}
				>
					<UploadIcon size={13} />
					{uploading ? "Uploading…" : "Upload"}
				</Button>
				<input
					ref={inputRef}
					type="file"
					multiple
					accept="image/*,video/*,.pdf,.txt,.md"
					className="hidden"
					onChange={handleInputChange}
					aria-label="Upload files"
				/>
			</div>

			<section
				className={cn("flex-1 overflow-auto p-4 transition-colors", dragOver && "bg-primary/5")}
				onDragOver={(e) => {
					e.preventDefault();
					setDragOver(true);
				}}
				onDragLeave={() => setDragOver(false)}
				onDrop={handleDrop}
				aria-label="File drop zone"
			>
				{items.length === 0 && (
					<div className="flex h-full flex-col items-center justify-center gap-3 text-center">
						<UploadIcon size={32} className="text-muted-foreground/40" />
						<p className="text-sm text-muted-foreground">Drop files here or click Upload</p>
					</div>
				)}

				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
					{items.map((item) => (
						<div
							key={item.path}
							className="group relative rounded-lg border overflow-hidden bg-muted/20"
						>
							{isImage(item.name) ? (
								<button
									type="button"
									className="block w-full"
									onClick={() => setLightbox(item)}
									aria-label={`View ${item.name}`}
								>
									<img
										src={item.path}
										alt={item.name}
										className="aspect-square w-full object-cover"
										loading="lazy"
									/>
								</button>
							) : (
								<div className="flex aspect-square items-center justify-center bg-muted/30">
									<span className="text-2xl">📄</span>
								</div>
							)}
							<div className="p-1.5">
								<p className="truncate text-xs text-muted-foreground">{item.name}</p>
							</div>
							<div className="absolute right-1 top-1 hidden gap-1 group-hover:flex">
								<a
									href={item.path}
									download={item.name}
									className="flex h-6 w-6 items-center justify-center rounded bg-black/60 text-white hover:bg-black/80"
									aria-label={`Download ${item.name}`}
								>
									<DownloadIcon size={11} />
								</a>
								<button
									type="button"
									onClick={() => removeItem(item.path)}
									className="flex h-6 w-6 items-center justify-center rounded bg-black/60 text-white hover:bg-destructive"
									aria-label={`Remove ${item.name}`}
								>
									<TrashIcon size={11} />
								</button>
							</div>
						</div>
					))}
				</div>
			</section>

			{/* Lightbox */}
			{lightbox && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
					onClick={() => setLightbox(null)}
					onKeyDown={(e) => e.key === "Escape" && setLightbox(null)}
					role="dialog"
					aria-label="Image preview"
					aria-modal="true"
				>
					<button
						type="button"
						onClick={() => setLightbox(null)}
						className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
						aria-label="Close preview"
					>
						<XIcon size={16} />
					</button>
					<img
						src={lightbox.path}
						alt={lightbox.name}
						className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
					/>
				</div>
			)}
		</div>
	);
}
