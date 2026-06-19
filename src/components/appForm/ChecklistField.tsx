import { PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import { Field, FieldContent, FieldGroup, FieldLabel } from "#/components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "#/components/ui/input-group";
import { useFieldContext } from "#/hooks/app-form-context";
import { FieldShell } from "./FieldShell";
import type { ComponentFieldProps } from "./types";

type ChecklistFieldItem = { id: string; text: string; checked: boolean };

export function ChecklistField({
	label,
	description,
	orientation,
	placeholder,
	...props
}: { placeholder?: string } & ComponentFieldProps<typeof FieldGroup>) {
	const field = useFieldContext<ChecklistFieldItem[]>();
	const [newItemText, setNewItemText] = useState("");

	const addItem = () => {
		const text = newItemText.trim();
		if (!text) return;
		field.handleChange([...field.state.value, { id: crypto.randomUUID(), text, checked: false }]);
		setNewItemText("");
	};

	return (
		<FieldShell label={label} description={description} orientation={orientation}>
			<FieldGroup {...props}>
				{field.state.value.map((item) => (
					<Field key={item.id} orientation="horizontal">
						<Checkbox
							id={item.id}
							checked={item.checked}
							onCheckedChange={(checked) =>
								field.handleChange(
									field.state.value.map((entry) =>
										entry.id === item.id ? { ...entry, checked: checked === true } : entry,
									),
								)
							}
						/>
						<FieldContent>
							<FieldLabel htmlFor={item.id}>{item.text}</FieldLabel>
						</FieldContent>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label={`Remove ${item.text}`}
							onClick={() =>
								field.handleChange(field.state.value.filter((entry) => entry.id !== item.id))
							}
						>
							<XIcon />
						</Button>
					</Field>
				))}
				<InputGroup>
					<InputGroupInput
						value={newItemText}
						placeholder={placeholder ?? "Add item…"}
						onChange={(event) => setNewItemText(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.preventDefault();
								addItem();
							}
						}}
					/>
					<InputGroupAddon align="inline-end">
						<InputGroupButton onClick={addItem} aria-label="Add item">
							<PlusIcon />
						</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>
			</FieldGroup>
		</FieldShell>
	);
}
