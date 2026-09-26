import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { Badge } from "#/components/ui/badge";
import { Card } from "#/components/ui/card";
import { Item } from "#/components/ui/item";
import { render } from "#/test/utils";

/** Sizes measured from the real CSS, since a recipe can silently lose classes it extends. */

function style(text: string): CSSStyleDeclaration {
	return getComputedStyle(page.getByText(text).element());
}

describe("Badge", () => {
	test("is shorter than a button", async () => {
		await render(<Badge>3</Badge>);
		expect(page.getByText("3").element().getBoundingClientRect().height).toBe(20);
	});
});

describe("Card", () => {
	test("size sets the padding of the root and its parts", async () => {
		await render(
			<>
				<Card.Root size="sm">
					<Card.Content>small</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Content>medium</Card.Content>
				</Card.Root>
			</>,
		);
		expect(style("small").paddingLeft).toBe("12px");
		expect(style("medium").paddingLeft).toBe("16px");
	});
});

describe("Item", () => {
	test("size sets the row padding", async () => {
		await render(
			<Item.Group>
				<Item.Root size="sm">small</Item.Root>
				<Item.Root>medium</Item.Root>
			</Item.Group>,
		);
		expect(style("small").paddingLeft).toBe("10px");
		expect(style("medium").paddingLeft).toBe("12px");
	});
});
