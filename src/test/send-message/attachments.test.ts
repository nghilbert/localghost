import { describe, expect, it } from "vitest";
import {
	composeMessageContent,
	type ImageAttachment,
	isImageFile,
} from "#/features/send-message/lib/attachments";

const image: ImageAttachment = {
	id: "1",
	name: "cat.png",
	dataUrl: "data:image/png;base64,AAAA",
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

	it("omits the text part when the message is image-only", () => {
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
