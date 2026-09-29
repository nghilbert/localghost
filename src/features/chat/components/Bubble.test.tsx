import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "#/test/utils";
import { Bubble, BubbleContent } from "./Bubble";
import { Message, MessageContent } from "./Message";

const TRANSPARENT = "rgba(0, 0, 0, 0)";

function backgroundOf(text: string) {
	return getComputedStyle(page.getByText(text).element()).backgroundColor;
}

function topCornersOf(text: string) {
	const style = getComputedStyle(page.getByText(text).element());
	return {
		left: parseFloat(style.borderTopLeftRadius),
		right: parseFloat(style.borderTopRightRadius),
	};
}

describe("Bubble", () => {
	it("fills a solid bubble by default", async () => {
		await render(
			<Bubble>
				<BubbleContent>hello</BubbleContent>
			</Bubble>,
		);
		await expect.poll(() => backgroundOf("hello")).not.toBe(TRANSPARENT);
	});

	it("draws no fill for a quiet bubble", async () => {
		await render(
			<Bubble variant="quiet">
				<BubbleContent>reply</BubbleContent>
			</Bubble>,
		);
		await expect.poll(() => backgroundOf("reply")).toBe(TRANSPARENT);
	});

	it("squares the top corner on the start side", async () => {
		await render(
			<Message>
				<MessageContent>
					<Bubble>
						<BubbleContent>from them</BubbleContent>
					</Bubble>
				</MessageContent>
			</Message>,
		);
		await expect.poll(() => topCornersOf("from them").left).toBe(0);
		expect(topCornersOf("from them").right).toBeGreaterThan(0);
	});

	it("squares the top corner on the end side", async () => {
		await render(
			<Message align="end">
				<MessageContent>
					<Bubble>
						<BubbleContent>from me</BubbleContent>
					</Bubble>
				</MessageContent>
			</Message>,
		);
		await expect.poll(() => topCornersOf("from me").right).toBe(0);
		expect(topCornersOf("from me").left).toBeGreaterThan(0);
	});
});
