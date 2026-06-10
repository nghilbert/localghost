import { XIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import type { GalleryItem } from "../lib/types";

type GalleryLightboxProps = {
	item: GalleryItem;
	idx: number;
	total: number;
	onClose: () => void;
	onPrev: () => void;
	onNext: () => void;
	onKeyDown: (e: React.KeyboardEvent) => void;
};

export function GalleryLightbox({
	item,
	idx,
	total,
	onClose,
	onPrev,
	onNext,
	onKeyDown,
}: GalleryLightboxProps) {
	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
			onClick={onClose}
			onKeyDown={onKeyDown}
			role="dialog"
			aria-label="Image preview"
			aria-modal="true"
			tabIndex={-1}
		>
			<Button
				variant="ghost"
				size="icon"
				onClick={onClose}
				className="absolute right-4 top-4 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white"
				aria-label="Close preview"
			>
				<XIcon size={16} />
			</Button>
			{idx > 0 && (
				<Button
					variant="ghost"
					size="icon"
					onClick={(e) => {
						e.stopPropagation();
						onPrev();
					}}
					className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white"
					aria-label="Previous"
				>
					‹
				</Button>
			)}
			{idx < total - 1 && (
				<Button
					variant="ghost"
					size="icon"
					onClick={(e) => {
						e.stopPropagation();
						onNext();
					}}
					className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white"
					aria-label="Next"
				>
					›
				</Button>
			)}
			<img
				src={item.path}
				alt={item.name}
				className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
			/>
			<p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white/80 backdrop-blur-sm">
				{item.name}
			</p>
		</div>
	);
}
