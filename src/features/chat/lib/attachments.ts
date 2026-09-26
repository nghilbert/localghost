import type { ContentPart } from "@tanstack/ai/client";
import type { MultimodalContent } from "@tanstack/ai-client";
import { documentMessageParts, imageMessageParts } from "./messages";

/** Whether an attachment is an image or a document. */
type AttachmentKind = "image" | "document";

/** A file read into a base64 data URL, ready to send or preview. */
export type Attachment = {
	id: string;
	name: string;
	/** A `data:<mime>;base64,...` URL: the source for both sending and the preview. */
	dataUrl: string;
	mimeType: string;
	kind: AttachmentKind;
};

/** The largest attachment allowed, well under the chat request's 64 MB limit. */
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

/** The document types accepted when the model supports documents. */
const DOCUMENT_MIME_TYPES = ["application/pdf", "text/plain", "text/markdown"];

/** The file input's `accept` value for what the model supports, or undefined for nothing. */
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

/** Whether a file is an accepted image. */
export function isImageFile(file: File): boolean {
	return file.type.startsWith("image/");
}

/** Whether a file is an accepted document. Markdown often has a blank MIME type. */
export function isDocumentFile(file: File): boolean {
	return DOCUMENT_MIME_TYPES.includes(file.type) || /\.(md|markdown|txt)$/i.test(file.name);
}

/** The file's MIME type, or `text/markdown` when the browser left it blank. */
function attachmentMimeType(file: File): string {
	if (file.type) return file.type;
	if (/\.(md|markdown)$/i.test(file.name)) return "text/markdown";
	if (/\.txt$/i.test(file.name)) return "text/plain";
	return "application/octet-stream";
}

/** Reads a file into an {@link Attachment}. */
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

/** The `sendMessage` content: the text alone, or attachments followed by the text. */
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
