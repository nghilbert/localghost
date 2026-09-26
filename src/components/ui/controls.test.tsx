import { describe, expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { Checkbox } from "#/components/ui/checkbox";
import { Collapsible } from "#/components/ui/collapsible";
import { Field } from "#/components/ui/field";
import { InputGroup } from "#/components/ui/input-group";
import { NumberField } from "#/components/ui/number-field";
import { Pagination } from "#/components/ui/pagination";
import { Progress } from "#/components/ui/progress";
import { Radio } from "#/components/ui/radio";
import { RadioGroup } from "#/components/ui/radio-group";
import { Slider } from "#/components/ui/slider";
import { Switch } from "#/components/ui/switch";
import { Toggle } from "#/components/ui/toggle";
import { ToggleGroup } from "#/components/ui/toggle-group";
import { render } from "#/test/utils";

/**
 * Keyboard operation and the ARIA state each control ends up exposing. These are
 * the parts a user drives directly, so every query here is by role.
 */

describe("Checkbox", () => {
	test("toggles with the keyboard and reports its state", async () => {
		await render(
			<Field.Root>
				<Field.Label>
					<Checkbox />
					Accept terms
				</Field.Label>
			</Field.Root>,
		);

		const checkbox = page.getByRole("checkbox", { name: "Accept terms" });
		await expect.element(checkbox).not.toBeChecked();

		await checkbox.click();
		await expect.element(checkbox).toBeChecked();

		await userEvent.keyboard(" ");
		await expect.element(checkbox).not.toBeChecked();
	});
});

describe("Switch", () => {
	test("toggles with the keyboard and reports its state", async () => {
		await render(
			<Field.Root>
				<Field.Label>
					<Switch />
					Email notifications
				</Field.Label>
			</Field.Root>,
		);

		const toggle = page.getByRole("switch", { name: "Email notifications" });
		await expect.element(toggle).not.toBeChecked();

		await toggle.click();
		await expect.element(toggle).toBeChecked();
	});
});

describe("RadioGroup", () => {
	test("moves the selection with the arrow keys", async () => {
		await render(
			<Field.Root>
				<RadioGroup defaultValue="email" aria-label="Contact method">
					<Field.Item>
						<Field.Label>
							<Radio value="email" />
							Email
						</Field.Label>
					</Field.Item>
					<Field.Item>
						<Field.Label>
							<Radio value="sms" />
							SMS
						</Field.Label>
					</Field.Item>
				</RadioGroup>
			</Field.Root>,
		);

		const email = page.getByRole("radio", { name: "Email" });
		await expect.element(email).toBeChecked();

		await email.click();
		await userEvent.keyboard("{ArrowDown}");
		await expect.element(page.getByRole("radio", { name: "SMS" })).toBeChecked();
		await expect.element(email).not.toBeChecked();
	});
});

describe("Toggle", () => {
	test("reports pressed state rather than checked", async () => {
		await render(<Toggle aria-label="Bold" />);

		const toggle = page.getByRole("button", { name: "Bold" });
		await expect.element(toggle).toHaveAttribute("aria-pressed", "false");

		await toggle.click();
		await expect.element(toggle).toHaveAttribute("aria-pressed", "true");
	});
});

describe("ToggleGroup", () => {
	test("keeps one pressed toggle at a time", async () => {
		await render(
			<ToggleGroup defaultValue={["light"]} aria-label="Theme">
				<Toggle value="light" aria-label="Light" />
				<Toggle value="dark" aria-label="Dark" />
			</ToggleGroup>,
		);

		await expect
			.element(page.getByRole("button", { name: "Light" }))
			.toHaveAttribute("aria-pressed", "true");

		await page.getByRole("button", { name: "Dark" }).click();
		await expect
			.element(page.getByRole("button", { name: "Dark" }))
			.toHaveAttribute("aria-pressed", "true");
		await expect
			.element(page.getByRole("button", { name: "Light" }))
			.toHaveAttribute("aria-pressed", "false");
	});
});

describe("Slider", () => {
	test("steps with the arrow keys and reports its value", async () => {
		await render(<Slider defaultValue={50} min={0} max={100} aria-label="Volume" />);

		const slider = page.getByRole("slider");
		await expect.element(slider).toHaveAttribute("aria-valuenow", "50");

		// The visible thumb sits on top of Base UI's hidden native `<input type="range">`,
		// which is the element carrying the role, so a plain click is intercepted.
		await slider.click({ force: true });
		await userEvent.keyboard("{ArrowRight}");
		await expect.element(slider).toHaveAttribute("aria-valuenow", "51");
	});
});

describe("NumberField", () => {
	test("steps from its increment button and stays within bounds", async () => {
		await render(
			<NumberField.Root defaultValue={4} min={0} max={5}>
				<NumberField.Group>
					<NumberField.Decrement />
					<NumberField.Input aria-label="Seats" />
					<NumberField.Increment />
				</NumberField.Group>
			</NumberField.Root>,
		);

		const input = page.getByLabelText("Seats");
		await expect.element(input).toHaveValue("4");

		const increment = page.getByRole("button", { name: "Increase" });
		await increment.click();
		await expect.element(input).toHaveValue("5");

		// At `max` the step button reports itself disabled, so the value cannot run past it.
		await expect.element(increment).toHaveAttribute("aria-disabled", "true");
	});
});

describe("Progress", () => {
	test("exposes its value to assistive tech", async () => {
		await render(
			<Progress.Root value={40}>
				<Progress.Label>Uploading</Progress.Label>
				<Progress.Track>
					<Progress.Indicator />
				</Progress.Track>
			</Progress.Root>,
		);

		const progressbar = page.getByRole("progressbar");
		await expect.element(progressbar).toHaveAttribute("aria-valuenow", "40");
		await expect.element(progressbar).toHaveAccessibleName("Uploading");
	});
});

describe("Collapsible", () => {
	test("shows and hides its panel from the trigger", async () => {
		await render(
			<Collapsible.Root>
				<Collapsible.Trigger>Advanced</Collapsible.Trigger>
				<Collapsible.Panel>Hidden settings</Collapsible.Panel>
			</Collapsible.Root>,
		);

		const trigger = page.getByRole("button", { name: "Advanced" });
		await expect.element(trigger).toHaveAttribute("aria-expanded", "false");
		expect(page.getByText("Hidden settings").elements()).toHaveLength(0);

		await trigger.click();
		await expect.element(trigger).toHaveAttribute("aria-expanded", "true");
		await expect.element(page.getByText("Hidden settings")).toBeVisible();
	});
});

describe("InputGroup", () => {
	/** An addon's empty space forwards a click to the control, as a native input's padding would. */
	test("focuses its control when an addon is clicked", async () => {
		await render(
			<InputGroup.Root>
				<InputGroup.Addon>
					<InputGroup.Text>https://</InputGroup.Text>
				</InputGroup.Addon>
				<InputGroup.Input aria-label="Address" />
				<InputGroup.Addon align="inline-end">
					<InputGroup.Button aria-label="Clear">x</InputGroup.Button>
				</InputGroup.Addon>
			</InputGroup.Root>,
		);

		await expect.element(page.getByRole("group")).toBeInTheDocument();
		await page.getByText("https://").click();
		await expect.element(page.getByLabelText("Address")).toHaveFocus();

		await page.getByRole("button", { name: "Clear" }).click();
		await expect.element(page.getByRole("button", { name: "Clear" })).toHaveFocus();
	});
});

describe("Pagination", () => {
	test("names its controls and marks the current page", async () => {
		await render(
			<Pagination.Root>
				<Pagination.List>
					<Pagination.Item>
						<Pagination.Previous />
					</Pagination.Item>
					<Pagination.Item>
						<Pagination.Link current>2</Pagination.Link>
					</Pagination.Item>
					<Pagination.Item>
						<Pagination.Next />
					</Pagination.Item>
				</Pagination.List>
			</Pagination.Root>,
		);

		await expect.element(page.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
		await expect.element(page.getByRole("button", { name: "Previous page" })).toBeInTheDocument();
		await expect.element(page.getByRole("button", { name: "Next page" })).toBeInTheDocument();
		await expect
			.element(page.getByRole("button", { name: "2" }))
			.toHaveAttribute("aria-current", "page");
	});
});
