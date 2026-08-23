import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import type { RenderResult } from "vitest-browser-react";
import { z } from "zod/v4";
import { useAppForm } from "#/shared/hooks/use-app-form";
import { render } from "#/test/utils";

const TRANSPORT_OPTIONS = [
	{ value: "http", label: "HTTP" },
	{ value: "sse", label: "SSE" },
];

function getTouched(screen: RenderResult) {
	return screen.getByTestId("touched").element().textContent === "true";
}

function FieldsHarness() {
	const form = useAppForm({ defaultValues: { transport: "http" } });

	return (
		<form.AppForm>
			<form.AppField name="transport">
				{(field) => <field.ToggleGroupField label="Transport" options={TRANSPORT_OPTIONS} />}
			</form.AppField>
			<form.Subscribe selector={(state) => state.values}>
				{(values) => <pre data-testid="values">{JSON.stringify(values)}</pre>}
			</form.Subscribe>
		</form.AppForm>
	);
}

function getValues(screen: RenderResult) {
	return JSON.parse(screen.getByTestId("values").element().textContent ?? "{}");
}

describe("ToggleGroupField", () => {
	it("renders the options and selects on click", async () => {
		const screen = await render(<FieldsHarness />);

		await expect.element(screen.getByTestId("transport-option-http")).toBeVisible();

		await screen.getByTestId("transport-option-sse").click();

		await expect.poll(() => getValues(screen).transport).toBe("sse");
	});

	it("keeps the current value when the selected item is clicked again", async () => {
		const screen = await render(<FieldsHarness />);

		await screen.getByTestId("transport-option-sse").click();
		await screen.getByTestId("transport-option-sse").click();

		await expect.poll(() => getValues(screen).transport).toBe("sse");
	});
});

function SelectHarness() {
	const form = useAppForm({ defaultValues: { transport: "http" } });
	return (
		<form.AppForm>
			<form.AppField name="transport">
				{(field) => <field.SelectField label="Transport" options={TRANSPORT_OPTIONS} />}
			</form.AppField>
			<form.Subscribe selector={(state) => state.fieldMeta.transport?.isTouched ?? false}>
				{(isTouched) => <pre data-testid="touched">{String(isTouched)}</pre>}
			</form.Subscribe>
		</form.AppForm>
	);
}

describe("SelectField", () => {
	it("marks the field touched when the popup closes", async () => {
		const screen = await render(<SelectHarness />);

		expect(getTouched(screen)).toBe(false);

		await screen.getByTestId("transport-select").click();
		// Escape closes the popup without changing the value; closing is this field's blur.
		await userEvent.keyboard("{Escape}");

		await expect.poll(() => getTouched(screen)).toBe(true);
	});
});

const SubmitSchema = z.object({
	name: z.string().trim().min(1, "Name is required"),
});

function SubmitHarness({ onSubmit }: { onSubmit: (name: string) => void }) {
	const form = useAppForm({
		defaultValues: { name: "" },
		validators: { onDynamic: SubmitSchema },
		onSubmit: async ({ value }) => onSubmit(value.name),
	});
	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				form.handleSubmit().catch(() => undefined);
			}}
		>
			<form.AppForm>
				<form.AppField name="name">{(field) => <field.InputField label="Name" />}</form.AppField>
				<form.SubmitButton data-testid="submit-button">Save</form.SubmitButton>
			</form.AppForm>
		</form>
	);
}

describe("useAppForm zod validation", () => {
	it("blocks submit and shows the field error when the schema fails", async () => {
		const handleSubmit = vi.fn();
		const screen = await render(<SubmitHarness onSubmit={handleSubmit} />);

		await screen.getByTestId("submit-button").click();

		await expect.element(screen.getByTestId("field-name")).toHaveTextContent("Name is required");
		// Base UI Field.Root wires the control to its error/description, which the old
		// manual id/htmlFor plumbing never did: the invalid control gets aria-invalid and an
		// aria-describedby pointing at the rendered error.
		await expect.element(screen.getByTestId("name-input")).toHaveAttribute("aria-invalid", "true");
		await expect.element(screen.getByTestId("name-input")).toHaveAttribute("aria-describedby");
		expect(handleSubmit).not.toHaveBeenCalled();
	});

	it("submits the value when the schema passes", async () => {
		const handleSubmit = vi.fn();
		const screen = await render(<SubmitHarness onSubmit={handleSubmit} />);

		await screen.getByTestId("name-input").fill("Odysseus");
		await screen.getByTestId("submit-button").click();

		await expect.poll(() => handleSubmit.mock.calls).toEqual([["Odysseus"]]);
	});
});

function AsyncSubmitHarness({ submission }: { submission: Promise<void> }) {
	const form = useAppForm({
		defaultValues: { value: "" },
		onSubmit: () => submission,
	});

	return (
		<form.AppForm>
			<form.SubmitForm>
				<form.SubmitButton data-testid="async-submit">Save</form.SubmitButton>
			</form.SubmitForm>
		</form.AppForm>
	);
}

describe("useAppForm async submission", () => {
	it("stays submitting until the returned promise resolves", async () => {
		const submission = Promise.withResolvers<void>();
		const screen = await render(<AsyncSubmitHarness submission={submission.promise} />);
		const button = screen.getByTestId("async-submit");

		await button.click();
		await expect.element(button).toBeDisabled();

		submission.resolve();
		await expect.element(button).toBeEnabled();
	});

	it("leaves submitting state when the returned promise rejects", async () => {
		const submission = Promise.withResolvers<void>();
		const screen = await render(<AsyncSubmitHarness submission={submission.promise} />);
		const button = screen.getByTestId("async-submit");

		await button.click();
		await expect.element(button).toBeDisabled();

		submission.reject(new Error("Save failed"));
		await expect.element(button).toBeEnabled();
	});
});

function PasswordHarness() {
	const form = useAppForm({ defaultValues: { password: "" } });
	return (
		<form.AppForm>
			<form.AppField name="password">
				{(field) => <field.PasswordField label="Password" />}
			</form.AppField>
		</form.AppForm>
	);
}

describe("PasswordField", () => {
	it("masks input by default and reveals it via the show/hide toggle", async () => {
		const screen = await render(<PasswordHarness />);

		const input = screen.getByTestId("password-input");
		await expect.element(input).toHaveAttribute("type", "password");

		await screen.getByTestId("password-toggle-visibility").click();

		await expect.element(input).toHaveAttribute("type", "text");
	});
});

function NumberHarness() {
	const form = useAppForm({ defaultValues: { amount: undefined as number | undefined } });
	return (
		<form.AppForm>
			<form.AppField name="amount">{(field) => <field.NumberField label="Amount" />}</form.AppField>
			<form.Subscribe selector={(state) => state.values}>
				{(values) => <pre data-testid="values">{JSON.stringify(values)}</pre>}
			</form.Subscribe>
		</form.AppForm>
	);
}

function SteppedNumberHarness() {
	const form = useAppForm({ defaultValues: { count: 2 as number | undefined } });
	return (
		<form.AppForm>
			<form.AppField name="count">
				{(field) => <field.NumberField label="Count" step={1} min={0} max={3} />}
			</form.AppField>
			<form.Subscribe selector={(state) => state.values}>
				{(values) => <pre data-testid="values">{JSON.stringify(values)}</pre>}
			</form.Subscribe>
		</form.AppForm>
	);
}

describe("NumberField", () => {
	it("steps with the increment button and clamps to the max", async () => {
		const screen = await render(<SteppedNumberHarness />);

		await screen.getByTestId("count-increment").click();
		await expect.poll(() => getValues(screen).count).toBe(3);

		// At max, Base UI disables the stepper, so the value can't be pushed past it.
		await expect.element(screen.getByTestId("count-increment")).toBeDisabled();
	});

	it("stores a typed value as a number and clearing it as undefined", async () => {
		const screen = await render(<NumberHarness />);
		const input = screen.getByTestId("amount-input");

		await input.fill("42");
		await expect.poll(() => getValues(screen).amount).toBe(42);

		await input.clear();
		await expect.poll(() => getValues(screen).amount).toBeUndefined();
	});
});

function SliderHarness() {
	const form = useAppForm({ defaultValues: { volume: 50 } });
	return (
		<form.AppForm>
			<form.AppField name="volume">
				{(field) => <field.SliderField label="Volume" step={10} />}
			</form.AppField>
			<form.Subscribe selector={(state) => state.values}>
				{(values) => <pre data-testid="values">{JSON.stringify(values)}</pre>}
			</form.Subscribe>
		</form.AppForm>
	);
}

describe("SliderField", () => {
	it("increases the value by one step on ArrowRight", async () => {
		const screen = await render(<SliderHarness />);

		// Base UI renders the focusable thumb (role="slider") inside our Slider root;
		// our data-testid scopes to it since we can't add one inside the library's markup.
		const thumb = screen.getByTestId("volume-slider").getByRole("slider", { includeHidden: true });
		thumb.element().focus();
		await userEvent.keyboard("{ArrowRight}");

		await expect.poll(() => getValues(screen).volume).toBe(60);
	});
});

function TextareaHarness() {
	const form = useAppForm({ defaultValues: { notes: "" } });
	return (
		<form.AppForm>
			<form.AppField name="notes">{(field) => <field.TextareaField label="Notes" />}</form.AppField>
			<form.Subscribe selector={(state) => state.values}>
				{(values) => <pre data-testid="values">{JSON.stringify(values)}</pre>}
			</form.Subscribe>
		</form.AppForm>
	);
}

describe("TextareaField", () => {
	it("preserves newlines in the form value", async () => {
		const screen = await render(<TextareaHarness />);

		await screen.getByTestId("notes-input").fill("line one\nline two");

		await expect.poll(() => getValues(screen).notes).toBe("line one\nline two");
	});
});
