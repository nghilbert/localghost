import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { Spinner } from "#/components/ui/spinner";
import { render } from "#/test/utils";

/** A spinner with no label is decoration: something else conveys the wait. */
test("is hidden from assistive tech by default", async () => {
	const { container } = await render(<Spinner />);

	expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
	expect(page.getByRole("status").elements()).toHaveLength(0);
});

test("announces the wait through a live region when given a label", async () => {
	await render(<Spinner label="Loading results" />);

	await expect.element(page.getByRole("status")).toHaveTextContent("Loading results");
});

/**
 * `size` names a variant, not a pixel count. Lucide types its own `size` as
 * `string | number` and renders it as a `width`/`height` attribute, so letting it
 * through would emit `width="sm"`.
 */
test("keeps the size variant off the svg's width attribute", async () => {
	const { container } = await render(<Spinner size="sm" />);
	const svg = container.querySelector("svg");

	expect(svg?.getAttribute("width")).not.toBe("sm");
	expect(svg?.getAttribute("height")).not.toBe("sm");
});
