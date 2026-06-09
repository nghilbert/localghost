export type GalleryItem = { path: string; name: string };

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"]);

export function isImage(name: string) {
	const ext = name.split(".").pop()?.toLowerCase() ?? "";
	return IMAGE_EXTS.has(ext);
}

export const galleryQueryOptions = {
	queryKey: ["gallery"],
	queryFn: async (): Promise<GalleryItem[]> => {
		const res = await fetch("/api/gallery/upload");
		if (!res.ok) return [];
		return res.json() as Promise<GalleryItem[]>;
	},
};
