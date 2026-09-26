import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "#/test/utils";
import { Bubble, BubbleContent } from "./Bubble";

const TRANSPARENT = "rgba(0, 0, 0, 0)";

function backgroundOf(text: string) {
	return getComputedStyle(page.getByText(text).element()).backgroundColor;
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
});
