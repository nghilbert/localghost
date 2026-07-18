import type { ContentPart } from "@tanstack/ai/client";
import type { MultimodalContent } from "@tanstack/ai-client";
import { documentMessageParts, imageMessageParts } from "#/shared/domain/conversation/messages";

/** Whether a staged attachment renders as a thumbnail (image) or a file chip (document). */
export type AttachmentKind = "image" | "document";

/** A file the composer has read into a base64 data URL, ready to send or preview. */
export type Attachment = {
	id: string;
	name: string;
	/** A `data:<mime>;base64,...` URL: the source for both sending and the preview. */
	dataUrl: string;
	mimeType: string;
	kind: AttachmentKind;
};

/**
 * Per-file size ceiling for a composer attachment. The stream route caps the
 * whole request body at 64 MB; this keeps a single file from dominating it and
 * keeps conversations loadable.
 */
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

/** Document MIME types the composer accepts, for providers that support documents. */
const DOCUMENT_MIME_TYPES = ["application/pdf", "text/plain", "text/markdown"];

/** The file input `accept` attribute for the two capabilities, or undefined for neither. */
export function attachmentAccept({
	images,
	documents,
}: {
	images: boolean;
	documents: boolean;
}): string | undefined {
	const types = [
		...(images ? ["image/png", "image/jpeg", "image/webp", "image/gif"] : []),
		...(documents ? ["application/pdf", "text/plain", "text/markdown", ".md", ".markdown"] : []),
	];
	return types.length > 0 ? types.join(",") : undefined;
}

/** Whether a dropped or pasted file is an image the composer accepts. */
export function isImageFile(file: File): boolean {
	return file.type.startsWith("image/");
}

/** Whether a file is a document the composer accepts (markdown often has a blank MIME type). */
export function isDocumentFile(file: File): boolean {
	return DOCUMENT_MIME_TYPES.includes(file.type) || /\.(md|markdown|txt)$/i.test(file.name);
}

/** The MIME type to tag an attachment with, inferring text/markdown when the browser left it blank. */
function attachmentMimeType(file: File): string {
	if (file.type) return file.type;
	if (/\.(md|markdown)$/i.test(file.name)) return "text/markdown";
	if (/\.txt$/i.test(file.name)) return "text/plain";
	return "application/octet-stream";
}

/** Reads a `File` into an {@link Attachment} carrying a base64 data URL and its kind. */
export function readAttachment(file: File): Promise<Attachment> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () =>
			resolve({
				id: crypto.randomUUID(),
				name: file.name,
				dataUrl: String(reader.result),
				mimeType: attachmentMimeType(file),
				kind: isImageFile(file) ? "image" : "document",
			});
		reader.onerror = () => reject(reader.error ?? new Error(`Couldn't read ${file.name}`));
		reader.readAsDataURL(file);
	});
}

/**
 * The `sendMessage` payload for a composed message: a plain string when there are
 * no attachments, or a {@link MultimodalContent} with images and documents ahead
 * of the text.
 */
export function composeMessageContent({
	text,
	attachments,
}: {
	text: string;
	attachments: Attachment[];
}): string | MultimodalContent {
	if (attachments.length === 0) return text;
	const media: ContentPart[] = [
		...imageMessageParts(attachments.filter((attachment) => attachment.kind === "image")),
		...documentMessageParts(attachments.filter((attachment) => attachment.kind === "document")),
	];
	const parts: ContentPart[] = text ? [...media, { type: "text", content: text }] : media;
	return { content: parts };
}
