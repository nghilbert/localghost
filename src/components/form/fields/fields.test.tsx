import { describe, expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { z } from "zod";
import { useAppForm } from "#/components/form/use-app-form";
import { FieldErrors } from "#/lib/form-errors";
import { render } from "#/test/utils";

/**
 * The form kit end to end: each field bound through `useAppForm`, submitted
 * through `form.Form` and `form.SubmitButton`, and read back the way a user
 * would find it, by label and role.
 */

describe("InputField", () => {
	test("shows the schema error inline, then submits a valid value", async () => {
		const submitted: string[] = [];
		function Harness() {
			const form = useAppForm({
				defaultValues: { name: "" },
				validators: { onDynamic: z.object({ name: z.string().min(1, "Name is required") }) },
				onSubmit: ({ value }) => {
					submitted.push(value.name);
				},
			});
			return (
				<form.AppForm>
					<form.Form>
						<form.AppField name="name">
							{(field) => <field.InputField label="Name" />}
						</form.AppField>
						<form.SubmitButton>Submit</form.SubmitButton>
					</form.Form>
				</form.AppForm>
			);
		}
		await render(<Harness />);

		const input = page.getByLabelText("Name");
		await page.getByRole("button", { name: "Submit" }).click();
		await expect.element(page.getByRole("alert")).toHaveTextContent("Name is required");
		await expect.element(input).toHaveAttribute("aria-invalid", "true");
		await expect.element(input).toHaveAccessibleDescription("Name is required");

		await input.fill("Odysseus");
		await page.getByRole("button", { name: "Submit" }).click();
		await expect.poll(() => submitted).toEqual(["Odysseus"]);
	});
});

describe("Form", () => {
	/** A failure only the server can know about lands on the field it names. */
	test("shows a thrown FieldErrors inline on the named field", async () => {
		function Harness() {
			const form = useAppForm({
				defaultValues: { username: "taken" },
				onSubmit: () => {
					throw new FieldErrors({ username: "That username is taken" });
				},
			});
			return (
				<form.AppForm>
					<form.Form>
						<form.AppField name="username">
							{(field) => <field.InputField label="Username" />}
						</form.AppField>
						<form.SubmitButton>Submit</form.SubmitButton>
					</form.Form>
				</form.AppForm>
			);
		}
		await render(<Harness />);

		await page.getByRole("button", { name: "Submit" }).click();
		await expect.element(page.getByRole("alert")).toHaveTextContent("That username is taken");
		await expect.element(page.getByLabelText("Username")).toHaveAttribute("aria-invalid", "true");
	});
});

describe("SubmitButton", () => {
	function Harness({ submission }: { submission: Promise<void> }) {
		const form = useAppForm({ defaultValues: { value: "" }, onSubmit: () => submission });
		return (
			<form.AppForm>
				<form.Form>
					<form.SubmitButton>Save</form.SubmitButton>
				</form.Form>
			</form.AppForm>
		);
	}

	test("stays disabled until the submission resolves", async () => {
		const submission = Promise.withResolvers<void>();
		await render(<Harness submission={submission.promise} />);
		const button = page.getByRole("button", { name: "Save" });

		await button.click();
		await expect.element(button).toHaveAttribute("aria-disabled", "true");

		submission.resolve();
		await expect.element(button).toHaveAttribute("aria-disabled", "false");
	});

	test("re-enables when the submission rejects", async () => {
		const submission = Promise.withResolvers<void>();
		await render(<Harness submission={submission.promise} />);
		const button = page.getByRole("button", { name: "Save" });

		await button.click();
		await expect.element(button).toHaveAttribute("aria-disabled", "true");

		submission.reject(new Error("Save failed"));
		await expect.element(button).toHaveAttribute("aria-disabled", "false");
	});
});

describe("CheckboxField", () => {
	test("toggles and submits its boolean value", async () => {
		const submitted: boolean[] = [];
		function Harness() {
			const form = useAppForm({
				defaultValues: { accept: false },
				onSubmit: ({ value }) => {
					submitted.push(value.accept);
				},
			});
			return (
				<form.AppForm>
					<form.Form>
						<form.AppField name="accept">
							{(field) => <field.CheckboxField label="Accept" />}
						</form.AppField>
						<form.SubmitButton>Submit</form.SubmitButton>
					</form.Form>
				</form.AppForm>
			);
		}
		await render(<Harness />);

		await page.getByRole("checkbox", { name: "Accept" }).click();
		await page.getByRole("button", { name: "Submit" }).click();
		await expect.poll(() => submitted).toEqual([true]);
	});
});

describe("SelectField", () => {
	test("picks an option, and closing the popup marks the field touched", async () => {
		function Harness() {
			const form = useAppForm({ defaultValues: { plan: "" } });
			return (
				<form.AppForm>
					<form.AppField name="plan">
						{(field) => (
							<field.SelectField
								label="Plan"
								options={[
									{ value: "starter", label: "Starter" },
									{ value: "pro", label: "Pro" },
								]}
							/>
						)}
					</form.AppField>
					<form.Subscribe selector={(state) => state.fieldMeta.plan?.isTouched ?? false}>
						{(isTouched) => <output>{isTouched ? "touched" : "untouched"}</output>}
					</form.Subscribe>
				</form.AppForm>
			);
		}
		await render(<Harness />);

		const trigger = page.getByRole("combobox", { name: "Plan" });
		await expect.element(page.getByRole("status")).toHaveTextContent("untouched");

		await trigger.click();
		await userEvent.keyboard("{Escape}");
		await expect.element(page.getByRole("status")).toHaveTextContent("touched");

		await trigger.click();
		await page.getByRole("option", { name: "Pro" }).click();
		await expect.element(trigger).toHaveTextContent("Pro");
	});
});

describe("PasswordField", () => {
	test("types masked, and the toggle reveals it", async () => {
		function Harness() {
			const form = useAppForm({ defaultValues: { password: "" } });
			return (
				<form.AppForm>
					<form.AppField name="password">
						{(field) => <field.PasswordField label="Password" />}
					</form.AppField>
				</form.AppForm>
			);
		}
		await render(<Harness />);

		const input = page.getByLabelText("Password", { exact: true });
		await input.fill("hunter2");
		await expect.element(input).toHaveAttribute("type", "password");

		await page.getByRole("button", { name: "Show password" }).click();
		await expect.element(input).toHaveAttribute("type", "text");
		await expect.element(input).toHaveValue("hunter2");
		await expect.element(page.getByRole("button", { name: "Hide password" })).toBeInTheDocument();
	});
});

describe("TextareaField", () => {
	test("keeps newlines in the submitted value", async () => {
		const submitted: string[] = [];
		function Harness() {
			const form = useAppForm({
				defaultValues: { notes: "" },
				onSubmit: ({ value }) => {
					submitted.push(value.notes);
				},
			});
			return (
				<form.AppForm>
					<form.Form>
						<form.AppField name="notes">
							{(field) => <field.TextareaField label="Notes" />}
						</form.AppField>
						<form.SubmitButton>Submit</form.SubmitButton>
					</form.Form>
				</form.AppForm>
			);
		}
		await render(<Harness />);

		await page.getByLabelText("Notes").fill("line one\nline two");
		await page.getByRole("button", { name: "Submit" }).click();
		await expect.poll(() => submitted).toEqual(["line one\nline two"]);
	});
});

describe("RadioGroupField", () => {
	test("picks an option and submits its value", async () => {
		const submitted: string[] = [];
		function Harness() {
			const form = useAppForm({
				defaultValues: { contact: "email" },
				onSubmit: ({ value }) => {
					submitted.push(value.contact);
				},
			});
			return (
				<form.AppForm>
					<form.Form>
						<form.AppField name="contact">
							{(field) => (
								<field.RadioGroupField
									label="Contact method"
									options={[
										{ value: "email", label: "Email" },
										{ value: "sms", label: "SMS" },
									]}
								/>
							)}
						</form.AppField>
						<form.SubmitButton>Submit</form.SubmitButton>
					</form.Form>
				</form.AppForm>
			);
		}
		await render(<Harness />);

		await page.getByRole("radio", { name: "SMS" }).click();
		await page.getByRole("button", { name: "Submit" }).click();
		await expect.poll(() => submitted).toEqual(["sms"]);
	});
});

describe("SwitchField", () => {
	test("toggles and submits its boolean value", async () => {
		const submitted: boolean[] = [];
		function Harness() {
			const form = useAppForm({
				defaultValues: { notifications: false },
				onSubmit: ({ value }) => {
					submitted.push(value.notifications);
				},
			});
			return (
				<form.AppForm>
					<form.Form>
						<form.AppField name="notifications">
							{(field) => <field.SwitchField label="Email notifications" />}
						</form.AppField>
						<form.SubmitButton>Submit</form.SubmitButton>
					</form.Form>
				</form.AppForm>
			);
		}
		await render(<Harness />);

		await page.getByRole("switch", { name: "Email notifications" }).click();
		await page.getByRole("button", { name: "Submit" }).click();
		await expect.poll(() => submitted).toEqual([true]);
	});
});

describe("ComboboxField", () => {
	const UTC = { id: "utc", name: "UTC" };
	const NEW_YORK = { id: "america-new_york", name: "America/New York" };

	test("searches a flat list and stores the picked item's value", async () => {
		function Harness() {
			const form = useAppForm({ defaultValues: { timezone: "" } });
			return (
				<form.AppForm>
					<form.AppField name="timezone">
						{(field) => (
							<field.ComboboxField
								label="Timezone"
								items={[UTC, NEW_YORK]}
								itemToValue={(item) => item.id}
								itemToLabel={(item) => item.name}
							/>
						)}
					</form.AppField>
					<form.Subscribe selector={(state) => state.values.timezone}>
						{(timezone) => <output>{timezone}</output>}
					</form.Subscribe>
				</form.AppForm>
			);
		}
		await render(<Harness />);

		const input = page.getByRole("combobox", { name: "Timezone" });
		await input.fill("New York");
		await page.getByRole("option", { name: "America/New York" }).click();
		await expect.element(input).toHaveValue("America/New York");
		await expect.element(page.getByRole("status")).toHaveTextContent("america-new_york");
	});

	test("lists grouped items under their group labels", async () => {
		function Harness() {
			const form = useAppForm({ defaultValues: { timezone: "" } });
			return (
				<form.AppForm>
					<form.AppField name="timezone">
						{(field) => (
							<field.ComboboxField
								label="Timezone"
								groups={[
									{ id: "global", label: "Global", items: [UTC] },
									{ id: "americas", label: "Americas", items: [NEW_YORK] },
								]}
								itemToValue={(item) => item.id}
								itemToLabel={(item) => item.name}
								renderItem={(item) => <span>{item.name} zone</span>}
							/>
						)}
					</form.AppField>
				</form.AppForm>
			);
		}
		await render(<Harness />);

		await page.getByRole("combobox", { name: "Timezone" }).click();
		await userEvent.keyboard("{ArrowDown}");
		await expect.element(page.getByRole("group", { name: "Americas" })).toBeInTheDocument();
		await page.getByRole("option", { name: "UTC zone" }).click();
		await expect.element(page.getByRole("combobox", { name: "Timezone" })).toHaveValue("UTC");
	});
});

describe("ToggleGroupField", () => {
	function Harness({ onSubmit }: { onSubmit: (theme: string) => void }) {
		const form = useAppForm({
			defaultValues: { theme: "system" },
			onSubmit: ({ value }) => onSubmit(value.theme),
		});
		return (
			<form.AppForm>
				<form.Form>
					<form.AppField name="theme">
						{(field) => (
							<field.ToggleGroupField
								label="Theme"
								options={[
									{ value: "light", label: "Light" },
									{ value: "dark", label: "Dark" },
									{ value: "system", label: "System" },
								]}
							/>
						)}
					</form.AppField>
					<form.SubmitButton>Submit</form.SubmitButton>
				</form.Form>
			</form.AppForm>
		);
	}

	test("selects an option and submits its value", async () => {
		const submitted: string[] = [];
		await render(<Harness onSubmit={(theme) => submitted.push(theme)} />);

		await page.getByRole("button", { name: "Dark" }).click();
		await page.getByRole("button", { name: "Submit" }).click();
		await expect.poll(() => submitted).toEqual(["dark"]);
	});

	test("keeps the value when the pressed option is pressed again", async () => {
		const submitted: string[] = [];
		await render(<Harness onSubmit={(theme) => submitted.push(theme)} />);

		await page.getByRole("button", { name: "Dark" }).click();
		await page.getByRole("button", { name: "Dark" }).click();
		await page.getByRole("button", { name: "Submit" }).click();
		await expect.poll(() => submitted).toEqual(["dark"]);
	});
});

describe("NumberField", () => {
	test("steps up to its max and stops there", async () => {
		const submitted: (number | undefined)[] = [];
		function Harness() {
			const form = useAppForm({
				defaultValues: { count: 2 },
				onSubmit: ({ value }) => {
					submitted.push(value.count);
				},
			});
			return (
				<form.AppForm>
					<form.Form>
						<form.AppField name="count">
							{(field) => <field.NumberField label="Count" min={0} max={3} />}
						</form.AppField>
						<form.SubmitButton>Submit</form.SubmitButton>
					</form.Form>
				</form.AppForm>
			);
		}
		await render(<Harness />);

		const increment = page.getByRole("button", { name: "Increase" });
		await increment.click();
		await expect.element(page.getByLabelText("Count")).toHaveValue("3");
		await expect.element(increment).toHaveAttribute("aria-disabled", "true");

		await page.getByRole("button", { name: "Submit" }).click();
		await expect.poll(() => submitted).toEqual([3]);
	});

	test("stores a cleared value as undefined, not zero", async () => {
		function Harness() {
			const form = useAppForm({ defaultValues: { amount: 5 } });
			return (
				<form.AppForm>
					<form.AppField name="amount">
						{(field) => <field.NumberField label="Amount" />}
					</form.AppField>
					<form.Subscribe selector={(state) => state.values.amount}>
						{(amount) => <output>{amount === undefined ? "unset" : amount}</output>}
					</form.Subscribe>
				</form.AppForm>
			);
		}
		await render(<Harness />);

		const input = page.getByLabelText("Amount");
		await input.fill("42");
		await expect.element(page.getByRole("status")).toHaveTextContent("42");

		await input.clear();
		await expect.element(page.getByRole("status")).toHaveTextContent("unset");
	});
});

describe("SliderField", () => {
	test("moves one step with the arrow keys and submits the number", async () => {
		const submitted: number[] = [];
		function Harness() {
			const form = useAppForm({
				defaultValues: { volume: 50 },
				onSubmit: ({ value }) => {
					submitted.push(value.volume);
				},
			});
			return (
				<form.AppForm>
					<form.Form>
						<form.AppField name="volume">
							{(field) => <field.SliderField label="Volume" min={0} max={100} step={10} />}
						</form.AppField>
						<form.SubmitButton>Submit</form.SubmitButton>
					</form.Form>
				</form.AppForm>
			);
		}
		await render(<Harness />);

		// The visible thumb sits over Base UI's hidden range input, which carries the role,
		// so a plain click is intercepted.
		await page.getByRole("slider").click({ force: true });
		await userEvent.keyboard("{ArrowRight}");
		await page.getByRole("button", { name: "Submit" }).click();
		await expect.poll(() => submitted).toEqual([60]);
	});
});
