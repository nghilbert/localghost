import { revalidateLogic } from "@tanstack/react-form";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";
import { useAppForm } from "#/hooks/use-app-form";
import { fireEvent, render, screen } from "#/test/utils";

const TRANSPORT_OPTIONS = [
	{ value: "http", label: "HTTP" },
	{ value: "sse", label: "SSE" },
];

const EVENT_OPTIONS = [
	{ value: "chat.completed", label: "Chat completed" },
	{ value: "task.finished", label: "Task finished" },
];

function FieldsHarness() {
	const form = useAppForm({
		defaultValues: { transport: "http", events: [] as string[], color: "#ff0000" },
	});
	return (
		<form.AppForm>
			<form.AppField name="transport">
				{(field) => <field.ToggleGroupField label="Transport" options={TRANSPORT_OPTIONS} />}
			</form.AppField>
			<form.AppField name="events">
				{(field) => <field.MultiToggleField label="Events" options={EVENT_OPTIONS} />}
			</form.AppField>
			<form.AppField name="color">{(field) => <field.ColorField label="Color" />}</form.AppField>
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
		expect(screen.getByRole("radio", { name: "HTTP" })).toBeInTheDocument();
		await user.click(screen.getByRole("radio", { name: "SSE" }));
		expect(getValues().transport).toBe("sse");
	});

	it("keeps the current value when the selected item is clicked again", async () => {
		const user = userEvent.setup();
		render(<FieldsHarness />);
		await user.click(screen.getByRole("radio", { name: "SSE" }));
		await user.click(screen.getByRole("radio", { name: "SSE" }));
		expect(getValues().transport).toBe("sse");
	});
});

describe("MultiToggleField", () => {
	it("accumulates multiple selections and removes them on re-click", async () => {
		const user = userEvent.setup();
		render(<FieldsHarness />);
		await user.click(screen.getByRole("button", { name: "Chat completed" }));
		await user.click(screen.getByRole("button", { name: "Task finished" }));
		expect(getValues().events).toEqual(["chat.completed", "task.finished"]);
		await user.click(screen.getByRole("button", { name: "Chat completed" }));
		expect(getValues().events).toEqual(["task.finished"]);
	});
});

describe("ColorField", () => {
	it("shows the value as the swatch color and updates from the color input", () => {
		render(<FieldsHarness />);
		expect(screen.getByRole("button", { name: "Pick color" })).toHaveStyle({
			backgroundColor: "#ff0000",
		});
		fireEvent.change(screen.getByLabelText("Color"), { target: { value: "#00ff00" } });
		expect(getValues().color).toBe("#00ff00");
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
				<form.SubmitButton>Save</form.SubmitButton>
			</form.AppForm>
		</form>
	);
}

describe("useAppForm zod validation", () => {
	it("blocks submit and shows the field error when the schema fails", async () => {
		const user = userEvent.setup();
		const handleSubmit = vi.fn();
		render(<SubmitHarness onSubmit={handleSubmit} />);
		await user.click(screen.getByRole("button", { name: "Save" }));
		expect(await screen.findByText("Name is required")).toBeInTheDocument();
		expect(handleSubmit).not.toHaveBeenCalled();
	});

	it("submits the value when the schema passes", async () => {
		const user = userEvent.setup();
		const handleSubmit = vi.fn();
		render(<SubmitHarness onSubmit={handleSubmit} />);
		await user.type(screen.getByLabelText("Name"), "Odysseus");
		await user.click(screen.getByRole("button", { name: "Save" }));
		expect(handleSubmit).toHaveBeenCalledWith("Odysseus");
	});
});
