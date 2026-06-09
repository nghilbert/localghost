import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { UploadCloudIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "#/components/PageHeader";
import { Button } from "#/components/ui/button";
import { GalleryGrid } from "#/features/gallery/components/GalleryGrid";
import { GalleryLightbox } from "#/features/gallery/components/GalleryLightbox";
import { galleryQueryOptions, isImage } from "#/features/gallery/lib/types";

export const Route = createFileRoute("/_authenticated/gallery")({
	component: GalleryPage,
});

function GalleryPage() {
	const queryClient = useQueryClient();
	const { data: items = [] } = useQuery(galleryQueryOptions);
	const inputRef = useRef<HTMLInputElement>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
	const [isDragOver, setIsDragOver] = useState(false);

	const imageItems = items.filter((i) => isImage(i.name));
	const lightboxItem = lightboxIdx !== null ? (imageItems[lightboxIdx] ?? null) : null;

	async function uploadFiles(files: FileList | File[]) {
		setIsUploading(true);
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
		setIsUploading(false);
		if (ok > 0) toast.success(`Uploaded ${ok} file${ok !== 1 ? "s" : ""}`);
	}

	async function handleRemove(path: string) {
		await fetch("/api/gallery/upload", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ path }),
		});
		await queryClient.invalidateQueries({ queryKey: ["gallery"] });
		toast.success("File removed");
	}

	function handleDrop(e: React.DragEvent) {
		e.preventDefault();
		setIsDragOver(false);
		if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (!lightboxItem) return;
		if (e.key === "Escape") setLightboxIdx(null);
		if (e.key === "ArrowRight")
			setLightboxIdx((i) => (i !== null ? Math.min(i + 1, imageItems.length - 1) : null));
		if (e.key === "ArrowLeft") setLightboxIdx((i) => (i !== null ? Math.max(i - 1, 0) : null));
	}

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
							disabled={isUploading}
						>
							<UploadCloudIcon size={14} />
							{isUploading ? "Uploading…" : "Upload"}
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

			<GalleryGrid
				items={items}
				isDragOver={isDragOver}
				onDragOver={(e) => {
					e.preventDefault();
					setIsDragOver(true);
				}}
				onDragLeave={() => setIsDragOver(false)}
				onDrop={handleDrop}
				onPreview={setLightboxIdx}
				onRemove={handleRemove}
			/>

			{lightboxItem && lightboxIdx !== null && (
				<GalleryLightbox
					item={lightboxItem}
					idx={lightboxIdx}
					total={imageItems.length}
					onClose={() => setLightboxIdx(null)}
					onPrev={() => setLightboxIdx((i) => (i !== null ? i - 1 : null))}
					onNext={() => setLightboxIdx((i) => (i !== null ? i + 1 : null))}
					onKeyDown={handleKeyDown}
				/>
			)}
		</div>
	);
}
