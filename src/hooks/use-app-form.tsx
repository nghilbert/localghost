import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import { EyeIcon, EyeOffIcon, PlusIcon, XIcon } from "lucide-react";
import { type ComponentProps, type ElementType, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "#/components/ui/input-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Spinner } from "#/components/ui/spinner";
import { Switch } from "#/components/ui/switch";
import { Textarea } from "#/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { cn } from "#/lib/utils";

type FieldProps<TProps extends ElementType> = {
	label: string;
	description?: string;
} & Omit<ComponentProps<TProps>, "id" | "value" | "onChange" | "onBlur">;

const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts();

function InputField({ label, description, ...props }: FieldProps<typeof Input>) {
	const field = useFieldContext<string>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
	return (
		<Field data-invalid={isInvalid}>
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			<Input
				id={field.name}
				value={field.state.value}
				onBlur={field.handleBlur}
				onChange={(event) => field.handleChange(event.target.value)}
				aria-invalid={isInvalid}
				{...props}
			/>
			{description && <FieldDescription>{description}</FieldDescription>}
			<FieldError>{field.state.meta.errorMap.onDynamic?.[0]?.message}</FieldError>
		</Field>
	);
}

function PasswordField({ label, ...props }: FieldProps<typeof InputGroupInput>) {
	const field = useFieldContext<string>();
	const [show, setShow] = useState(false);
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<Field data-invalid={isInvalid}>
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			<InputGroup>
				<InputGroupInput
					id={field.name}
					value={field.state.value}
					onBlur={field.handleBlur}
					onChange={(event) => field.handleChange(event.target.value)}
					aria-invalid={isInvalid}
					{...props}
					type={show ? "text" : "password"}
				/>
				<InputGroupAddon align="inline-end">
					<Tooltip>
						<TooltipTrigger asChild>
							<InputGroupButton onClick={() => setShow((prev) => !prev)}>
								{show ? <EyeOffIcon /> : <EyeIcon />}
							</InputGroupButton>
						</TooltipTrigger>
						<TooltipContent>{show ? "Hide password" : "Show password"}</TooltipContent>
					</Tooltip>
				</InputGroupAddon>
			</InputGroup>
			<FieldError>{field.state.meta.errorMap.onDynamic?.[0]?.message}</FieldError>
		</Field>
	);
}

function TextareaField({ label, description, ...props }: FieldProps<typeof Textarea>) {
	const field = useFieldContext<string>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
	return (
		<Field data-invalid={isInvalid}>
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			<Textarea
				id={field.name}
				value={field.state.value}
				onBlur={field.handleBlur}
				onChange={(event) => field.handleChange(event.target.value)}
				aria-invalid={isInvalid}
				{...props}
			/>
			{description && <FieldDescription>{description}</FieldDescription>}
			<FieldError>{field.state.meta.errorMap.onDynamic?.[0]?.message}</FieldError>
		</Field>
	);
}

type SelectFieldProps = {
	label: string;
	description?: string;
	options: { value: string; label: string }[];
	placeholder?: string;
};

function SelectField({ label, description, options, placeholder }: SelectFieldProps) {
	const field = useFieldContext<string>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
	return (
		<Field data-invalid={isInvalid}>
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			<Select value={field.state.value} onValueChange={(value) => field.handleChange(value)}>
				<SelectTrigger id={field.name} aria-invalid={isInvalid} onBlur={field.handleBlur}>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{description && <FieldDescription>{description}</FieldDescription>}
			<FieldError>{field.state.meta.errorMap.onDynamic?.[0]?.message}</FieldError>
		</Field>
	);
}

type ToggleGroupFieldProps = {
	label: string;
	options: { value: string; label: string }[];
};

function ToggleGroupField({ label, options }: ToggleGroupFieldProps) {
	const field = useFieldContext<string>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
	return (
		<Field data-invalid={isInvalid}>
			<FieldLabel>{label}</FieldLabel>
			<ToggleGroup
				type="single"
				variant="outline"
				size="sm"
				value={field.state.value}
				onValueChange={(value) => {
					if (value) field.handleChange(value);
				}}
				onBlur={field.handleBlur}
			>
				{options.map((option) => (
					<ToggleGroupItem key={option.value} value={option.value} aria-invalid={isInvalid}>
						{option.label}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
			<FieldError>{field.state.meta.errorMap.onDynamic?.[0]?.message}</FieldError>
		</Field>
	);
}

function MultiToggleField({ label, options }: ToggleGroupFieldProps) {
	const field = useFieldContext<string[]>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
	return (
		<Field data-invalid={isInvalid}>
			<FieldLabel>{label}</FieldLabel>
			<ToggleGroup
				type="multiple"
				variant="outline"
				size="sm"
				value={field.state.value}
				onValueChange={(value) => field.handleChange(value)}
				onBlur={field.handleBlur}
			>
				{options.map((option) => (
					<ToggleGroupItem key={option.value} value={option.value} aria-invalid={isInvalid}>
						{option.label}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
			<FieldError>{field.state.meta.errorMap.onDynamic?.[0]?.message}</FieldError>
		</Field>
	);
}

function ColorField({ label }: { label: string }) {
	const field = useFieldContext<string>();
	const colorInputRef = useRef<HTMLInputElement>(null);
	return (
		<Field orientation="horizontal">
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="h-8 w-8 rounded-full border-2 p-0"
				style={{ backgroundColor: field.state.value }}
				onClick={() => colorInputRef.current?.click()}
				aria-label={`Pick ${label.toLowerCase()}`}
			/>
			<input
				ref={colorInputRef}
				id={field.name}
				type="color"
				value={field.state.value}
				onChange={(event) => field.handleChange(event.target.value)}
				className="sr-only"
			/>
		</Field>
	);
}

function SwitchField({ label, description }: { label: string; description?: string }) {
	const field = useFieldContext<boolean>();
	return (
		<Field orientation="horizontal">
			<FieldContent>
				<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
				{description && <FieldDescription>{description}</FieldDescription>}
			</FieldContent>
			<Switch
				id={field.name}
				checked={field.state.value}
				onCheckedChange={(checked) => field.handleChange(checked)}
				onBlur={field.handleBlur}
			/>
		</Field>
	);
}

type SwatchFieldProps = {
	label: string;
	options: { value: string; label: string; swatchClassName: string }[];
};

function SwatchField({ label, options }: SwatchFieldProps) {
	const field = useFieldContext<string>();
	return (
		<Field>
			<FieldLabel>{label}</FieldLabel>
			<ToggleGroup
				type="single"
				variant="outline"
				size="sm"
				value={field.state.value}
				onValueChange={(value) => {
					if (value) field.handleChange(value);
				}}
				onBlur={field.handleBlur}
			>
				{options.map((option) => (
					<ToggleGroupItem key={option.value} value={option.value} aria-label={option.label}>
						<span className={cn("size-3 rounded-full border", option.swatchClassName)} />
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</Field>
	);
}

export type ChecklistFieldItem = {
	id: string;
	text: string;
	checked: boolean;
};

function ChecklistField({ label, placeholder }: { label: string; placeholder?: string }) {
	const field = useFieldContext<ChecklistFieldItem[]>();
	const [newItemText, setNewItemText] = useState("");

	function addItem() {
		const text = newItemText.trim();
		if (!text) return;
		field.handleChange([...field.state.value, { id: crypto.randomUUID(), text, checked: false }]);
		setNewItemText("");
	}

	return (
		<Field>
			<FieldLabel>{label}</FieldLabel>
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
					<FieldLabel htmlFor={item.id} className={cn("flex-1", item.checked && "line-through")}>
						{item.text}
					</FieldLabel>
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
			<FieldError>{field.state.meta.errorMap.onDynamic?.[0]?.message}</FieldError>
		</Field>
	);
}

function SubmitButton({ children, ...props }: ComponentProps<typeof Button>) {
	const { Subscribe } = useFormContext();

	return (
		<Subscribe selector={(state) => state.isSubmitting}>
			{(isSubmitting) => (
				<Button type="submit" disabled={isSubmitting} {...props}>
					{isSubmitting && <Spinner data-icon="inline-start" />}
					{children}
				</Button>
			)}
		</Subscribe>
	);
}

export const { useAppForm, withForm } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: {
		InputField,
		PasswordField,
		SelectField,
		TextareaField,
		ToggleGroupField,
		MultiToggleField,
		ColorField,
		SwitchField,
		SwatchField,
		ChecklistField,
	},
	formComponents: { SubmitButton },
});
