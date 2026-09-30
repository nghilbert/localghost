import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { Field } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { render } from "#/test/utils";

/**
 * Everything here covers accessibility this library adds on top of Base UI, or
 * logic it wrote itself. Base UI's own field wiring is its to test.
 */

test("associates the label and description with the control", async () => {
	await render(
		<Field.Root>
			<Field.Label>Email</Field.Label>
			<Input />
			<Field.Description>We never share it.</Field.Description>
		</Field.Root>,
	);

	const input = page.getByLabelText("Email");
	await expect.element(input).toBeInTheDocument();
	await expect.element(input).toHaveAccessibleDescription("We never share it.");
});

/**
 * Base UI's `Field.Error` only registers its id for `aria-describedby`; it sets no
 * role and no live region. An error raised on submit, while focus sits on the
 * submit button, would then reach nobody, so `role="alert"` is added by hand.
 */
test("announces an error through a live region, not only aria-describedby", async () => {
	await render(
		<Field.Root invalid>
			<Field.Label>Email</Field.Label>
			<Input />
			<Field.Error errors={["Email is required"]} />
		</Field.Root>,
	);

	await expect.element(page.getByRole("alert")).toHaveTextContent("Email is required");
});

test("renders a single error as text and several as a list", async () => {
	const { unmount } = await render(
		<Field.Root invalid>
			<Input />
			<Field.Error errors={["Too short"]} />
		</Field.Root>,
	);
	await expect.element(page.getByRole("alert")).toHaveTextContent("Too short");
	expect(page.getByRole("listitem").elements()).toHaveLength(0);
	await unmount();

	await render(
		<Field.Root invalid>
			<Input />
			<Field.Error errors={["Too short", "Needs a digit"]} />
		</Field.Root>,
	);
	expect(page.getByRole("listitem").elements()).toHaveLength(2);
});

/** `errors` accepts a Standard Schema issue as readily as a string. */
test("reads a message off an issue object and drops duplicates", async () => {
	await render(
		<Field.Root invalid>
			<Input />
			<Field.Error errors={[{ message: "Too short" }, "Too short", { message: "Needs a digit" }]} />
		</Field.Root>,
	);

	expect(page.getByRole("listitem").elements()).toHaveLength(2);
});

test("renders nothing when there is no message to show", async () => {
	await render(
		<Field.Root invalid>
			<Input />
			<Field.Error errors={[undefined, { message: undefined }]} />
		</Field.Root>,
	);

	expect(page.getByRole("alert").elements()).toHaveLength(0);
});

/**
 * `orientation` is published as `data-orientation` rather than applied through a
 * tv variant, because Base UI parts are siblings and a child part never receives
 * the Root's props.
 */
test("publishes its orientation for descendants to read", async () => {
	const { container } = await render(
		<Field.Root orientation="horizontal">
			<Field.Label>Notify me</Field.Label>
			<Input />
		</Field.Root>,
	);

	expect(container.querySelector("[data-orientation]")?.getAttribute("data-orientation")).toBe(
		"horizontal",
	);
});
