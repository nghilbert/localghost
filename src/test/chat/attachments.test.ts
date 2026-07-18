import { describe, expect, it } from "vitest";
import {
	type Attachment,
	composeMessageContent,
	isDocumentFile,
	isImageFile,
} from "#/routes/_authenticated/-lib/attachments";

const image: Attachment = {
	id: "1",
	name: "cat.png",
	dataUrl: "data:image/png;base64,AAAA",
	mimeType: "image/png",
	kind: "image",
};

const pdf: Attachment = {
	id: "2",
	name: "spec.pdf",
	dataUrl: "data:application/pdf;base64,JVBER",
	mimeType: "application/pdf",
	kind: "document",
};

describe("composeMessageContent", () => {
	it("returns the plain string when there are no attachments", () => {
		expect(composeMessageContent({ text: "hello", attachments: [] })).toBe("hello");
	});

	it("puts image parts ahead of the text part", () => {
		const content = composeMessageContent({ text: "what is this?", attachments: [image] });
		expect(content).toEqual({
			content: [
				{ type: "image", source: { type: "url", value: "data:image/png;base64,AAAA" } },
				{ type: "text", content: "what is this?" },
			],
		});
	});

	it("emits a document part as an inline base64 data source with its mime type and filename", () => {
		const content = composeMessageContent({ text: "summarize", attachments: [pdf] });
		expect(content).toEqual({
			content: [
				{
					type: "document",
					source: { type: "data", value: "JVBER", mimeType: "application/pdf" },
					metadata: { filename: "spec.pdf" },
				},
				{ type: "text", content: "summarize" },
			],
		});
	});

	it("orders images ahead of documents ahead of text", () => {
		const content = composeMessageContent({ text: "look", attachments: [pdf, image] });
		expect(content).toEqual({
			content: [
				{ type: "image", source: { type: "url", value: "data:image/png;base64,AAAA" } },
				{
					type: "document",
					source: { type: "data", value: "JVBER", mimeType: "application/pdf" },
					metadata: { filename: "spec.pdf" },
				},
				{ type: "text", content: "look" },
			],
		});
	});

	it("omits the text part when the message is attachment-only", () => {
		const content = composeMessageContent({ text: "", attachments: [image] });
		expect(content).toEqual({
			content: [{ type: "image", source: { type: "url", value: "data:image/png;base64,AAAA" } }],
		});
	});
});

describe("isImageFile", () => {
	it("accepts image files and rejects everything else", () => {
		expect(isImageFile(new File([], "a.png", { type: "image/png" }))).toBe(true);
		expect(isImageFile(new File([], "a.pdf", { type: "application/pdf" }))).toBe(false);
		expect(isImageFile(new File([], "a", { type: "" }))).toBe(false);
	});
});

describe("isDocumentFile", () => {
	it("accepts pdf, plain text, and markdown", () => {
		expect(isDocumentFile(new File([], "a.pdf", { type: "application/pdf" }))).toBe(true);
		expect(isDocumentFile(new File([], "a.txt", { type: "text/plain" }))).toBe(true);
		expect(isDocumentFile(new File([], "a.md", { type: "text/markdown" }))).toBe(true);
	});

	it("falls back to the extension when the browser leaves the MIME type blank", () => {
		expect(isDocumentFile(new File([], "notes.md", { type: "" }))).toBe(true);
		expect(isDocumentFile(new File([], "readme.markdown", { type: "" }))).toBe(true);
	});

	it("rejects images and unknown types", () => {
		expect(isDocumentFile(new File([], "a.png", { type: "image/png" }))).toBe(false);
		expect(isDocumentFile(new File([], "a.bin", { type: "application/octet-stream" }))).toBe(false);
	});
});
