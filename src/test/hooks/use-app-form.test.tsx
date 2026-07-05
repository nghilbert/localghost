import { revalidateLogic } from "@tanstack/react-form";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";
import { useAppForm } from "#/hooks/use-app-form";
import { render, screen, within } from "#/test/utils";

const TRANSPORT_OPTIONS = [
	{ value: "http", label: "HTTP" },
	{ value: "sse", label: "SSE" },
];

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

function getValues() {
	return JSON.parse(screen.getByTestId("values").textContent ?? "{}");
}

describe("ToggleGroupField", () => {
	it("renders the options and selects on click", async () => {
		const user = userEvent.setup();
		render(<FieldsHarness />);
		expect(screen.getByTestId("transport-option-http")).toBeInTheDocument();
		await user.click(screen.getByTestId("transport-option-sse"));
		expect(getValues().transport).toBe("sse");
	});

	it("keeps the current value when the selected item is clicked again", async () => {
		const user = userEvent.setup();
		render(<FieldsHarness />);
		await user.click(screen.getByTestId("transport-option-sse"));
		await user.click(screen.getByTestId("transport-option-sse"));
		expect(getValues().transport).toBe("sse");
	});
});

const SubmitSchema = z.object({
	name: z.string().trim().min(1, "Name is required"),
});

function SubmitHarness({ onSubmit }: { onSubmit: (name: string) => void }) {
	const form = useAppForm({
		defaultValues: { name: "" },
		validators: { onDynamic: SubmitSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value }) => onSubmit(value.name),
	});
	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				form.handleSubmit();
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
		const user = userEvent.setup();
		const handleSubmit = vi.fn();
		render(<SubmitHarness onSubmit={handleSubmit} />);
		await user.click(screen.getByTestId("submit-button"));
		expect(await screen.findByText("Name is required")).toBeInTheDocument();
		expect(handleSubmit).not.toHaveBeenCalled();
	});

	it("submits the value when the schema passes", async () => {
		const user = userEvent.setup();
		const handleSubmit = vi.fn();
		render(<SubmitHarness onSubmit={handleSubmit} />);
		await user.type(screen.getByTestId("name-input"), "Odysseus");
		await user.click(screen.getByTestId("submit-button"));
		expect(handleSubmit).toHaveBeenCalledWith("Odysseus");
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
		const user = userEvent.setup();
		render(<PasswordHarness />);

		const input = screen.getByTestId("password-input");
		expect(input).toHaveAttribute("type", "password");

		await user.click(screen.getByTestId("password-toggle-visibility"));
		expect(input).toHaveAttribute("type", "text");
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

describe("NumberField", () => {
	it("stores a typed value as a number and clearing it as undefined", async () => {
		const user = userEvent.setup();
		render(<NumberHarness />);

		const input = screen.getByTestId("amount-input");
		await user.type(input, "42");
		expect(getValues().amount).toBe(42);

		await user.clear(input);
		expect(getValues().amount).toBeUndefined();
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
		render(<SliderHarness />);

		// Base UI renders the focusable thumb (role="slider") inside our Slider root;
		// our data-testid scopes to it since we can't add one inside the library's markup.
		within(screen.getByTestId("volume-slider")).getByRole("slider", { hidden: true }).focus();
		await userEvent.setup().keyboard("{ArrowRight}");
		expect(getValues().volume).toBe(60);
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
		const user = userEvent.setup();
		render(<TextareaHarness />);

		await user.type(screen.getByTestId("notes-input"), "line one{Enter}line two");
		expect(getValues().notes).toBe("line one\nline two");
	});
});
