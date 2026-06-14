import { PlusIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import { Field, FieldContent, FieldGroup, FieldLabel } from "#/components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "#/components/ui/input-group";
import { Switch } from "#/components/ui/switch";
import { cn } from "#/lib/utils";
import { FieldShell } from "./FieldShell";
import type { BaseFieldProps, ComponentFieldProps } from "./types";

export function ColorField({
	label,
	description,
	...props
}: Omit<ComponentFieldProps<"input">, "type">) {
	const colorInputRef = useRef<HTMLInputElement>(null);

	return (
		<FieldShell<string> label={label} description={description}>
			{({ field, isInvalid }) => (
				<>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-8 w-8 rounded-full border-2 p-0"
						style={{ backgroundColor: field.state.value }}
						onClick={() => colorInputRef.current?.click()}
						aria-invalid={isInvalid}
						aria-label={`Pick ${label.toLowerCase()}`}
					/>
					<input
						ref={colorInputRef}
						id={field.name}
						type="color"
						value={field.state.value}
						onChange={(event) => field.handleChange(event.target.value)}
						{...props}
						className={cn("sr-only", props.className)}
					/>
				</>
			)}
		</FieldShell>
	);
}

export function SwitchField({ label, description, ...props }: ComponentFieldProps<typeof Switch>) {
	return (
		<FieldShell<boolean> label={label} description={description}>
			{({ field, isInvalid }) => (
				<Switch
					id={field.name}
					checked={field.state.value}
					onCheckedChange={(checked) => field.handleChange(checked)}
					onBlur={field.handleBlur}
					aria-invalid={isInvalid}
					{...props}
				/>
			)}
		</FieldShell>
	);
}

type ChecklistFieldItem = {
	id: string;
	text: string;
	checked: boolean;
};

export function ChecklistField({
	label,
	description,
	placeholder,
}: BaseFieldProps & { placeholder?: string }) {
	const [newItemText, setNewItemText] = useState("");

	return (
		<FieldShell<ChecklistFieldItem[]>
			label={label}
			description={description}
			orientation="vertical"
		>
			{({ field }) => {
				const addItem = () => {
					const text = newItemText.trim();
					if (!text) return;
					field.handleChange([
						...field.state.value,
						{ id: crypto.randomUUID(), text, checked: false },
					]);
					setNewItemText("");
				};

				return (
					<FieldGroup>
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
				);
			}}
		</FieldShell>
	);
}
