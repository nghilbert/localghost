import type { ContentPart } from "@tanstack/ai/client";
import type { MultimodalContent } from "@tanstack/ai-client";
import { imageMessageParts } from "#/shared/domain/conversation/messages";

/** An image the composer has read into a base64 data URL, ready to send or preview. */
export type ImageAttachment = {
	id: string;
	name: string;
	/** A `data:image/...;base64,...` URL: the source for both sending and the preview. */
	dataUrl: string;
};

/** Whether a dropped or pasted file is an image the composer accepts. */
export function isImageFile(file: File): boolean {
	return file.type.startsWith("image/");
}

/** Reads an image `File` into an {@link ImageAttachment} carrying a base64 data URL. */
export function readImageAttachment(file: File): Promise<ImageAttachment> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () =>
			resolve({ id: crypto.randomUUID(), name: file.name, dataUrl: String(reader.result) });
		reader.onerror = () => reject(reader.error ?? new Error(`Couldn't read ${file.name}`));
		reader.readAsDataURL(file);
	});
}

/**
 * The `sendMessage` payload for a composed message: a plain string when there are
 * no attachments, or a {@link MultimodalContent} with the images ahead of the text.
 */
export function composeMessageContent({
	text,
	attachments,
}: {
	text: string;
	attachments: ImageAttachment[];
}): string | MultimodalContent {
	if (attachments.length === 0) return text;
	const images = imageMessageParts(attachments);
	const parts: ContentPart[] = text ? [...images, { type: "text", content: text }] : images;
	return { content: parts };
}
