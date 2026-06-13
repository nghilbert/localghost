import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import { CircleAlertIcon, EyeIcon, EyeOffIcon, PlusIcon, XIcon } from "lucide-react";
import { type ComponentProps, type ElementType, type ReactNode, useRef, useState } from "react";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
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

type BaseFieldProps = { label: string; description?: string };
type FieldOption = { label: string; value: string };
type FormManagedPropKeys =
	| "id"
	| "value"
	| "onChange"
	| "onBlur"
	| "type"
	| "onValueChange"
	| "defaultValue";
type OmitManagedProps<T extends ElementType> = Omit<ComponentProps<T>, FormManagedPropKeys>;
type ComponentFieldProps<T extends ElementType> = BaseFieldProps & OmitManagedProps<T>;

const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts();

function InputField({ label, description, ...props }: ComponentFieldProps<typeof Input>) {
	const field = useFieldContext<string>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
	return (
		<Field orientation="responsive" data-invalid={isInvalid}>
			<FieldContent>
				<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
				{description && <FieldLabel>{description}</FieldLabel>}
			</FieldContent>
			<Input
				id={field.name}
				value={field.state.value}
				onBlur={field.handleBlur}
				onChange={(event) => field.handleChange(event.target.value)}
				aria-invalid={isInvalid}
				{...props}
			/>
			<FieldError>{field.state.meta.errorMap.onDynamic?.[0]?.message}</FieldError>
		</Field>
	);
}

function PasswordField({
	label,
	description,
	...props
}: ComponentFieldProps<typeof InputGroupInput>) {
	const field = useFieldContext<string>();
	const [show, setShow] = useState(false);
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<Field orientation="responsive" data-invalid={isInvalid}>
			<FieldContent>
				<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
				{description && <FieldLabel>{description}</FieldLabel>}
			</FieldContent>
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

function TextareaField({ label, description, ...props }: ComponentFieldProps<typeof Textarea>) {
	const field = useFieldContext<string>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<Field orientation="responsive" data-invalid={isInvalid}>
			<FieldContent>
				<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
				{description && <FieldLabel>{description}</FieldLabel>}
			</FieldContent>
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

type SelectFieldProps = ComponentFieldProps<typeof Select> & {
	options: FieldOption[];
	placeholder?: string;
};
function SelectField({ label, description, options, placeholder, ...props }: SelectFieldProps) {
	const field = useFieldContext<string>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<Field orientation="responsive" data-invalid={isInvalid}>
			<FieldContent>
				<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
				{description && <FieldLabel>{description}</FieldLabel>}
			</FieldContent>
			<Select
				value={field.state.value}
				onValueChange={(value) => field.handleChange(value)}
				{...props}
			>
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

type ToggleGroupFieldProps = ComponentFieldProps<typeof ToggleGroup> & { options: FieldOption[] };
function ToggleGroupField({ label, description, options, ...props }: ToggleGroupFieldProps) {
	const field = useFieldContext<string>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<Field orientation="responsive" data-invalid={isInvalid}>
			<FieldContent>
				<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
				{description && <FieldLabel>{description}</FieldLabel>}
			</FieldContent>
			<ToggleGroup
				type="single"
				variant="outline"
				size="sm"
				value={field.state.value}
				onValueChange={(value) => field.handleChange(value)}
				onBlur={field.handleBlur}
				{...props}
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

function MultiToggleField({ label, description, options, ...props }: ToggleGroupFieldProps) {
	const field = useFieldContext<string[]>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<Field orientation="responsive" data-invalid={isInvalid}>
			<FieldContent>
				<FieldLabel>{label}</FieldLabel>
				{description && <FieldLabel>{description}</FieldLabel>}
			</FieldContent>
			<ToggleGroup
				id={field.name}
				type="multiple"
				variant="outline"
				size="sm"
				value={field.state.value}
				onValueChange={(value) => field.handleChange(value)}
				onBlur={field.handleBlur}
				{...props}
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

function ColorField({ label, description }: BaseFieldProps) {
	const field = useFieldContext<string>();
	const colorInputRef = useRef<HTMLInputElement>(null);

	return (
		<Field orientation="responsive">
			<FieldContent>
				<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
				{description && <FieldDescription>{description}</FieldDescription>}
			</FieldContent>
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
			<FieldError>{field.state.meta.errorMap.onDynamic?.[0]?.message}</FieldError>
		</Field>
	);
}

function SwitchField({ label, description }: BaseFieldProps) {
	const field = useFieldContext<boolean>();

	return (
		<Field orientation="responsive">
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

type SwatchFieldProps = BaseFieldProps & { options: (FieldOption & { swatchClassName: string })[] };
function SwatchField({ label, description, options }: SwatchFieldProps) {
	const field = useFieldContext<string>();

	return (
		<Field>
			<FieldContent>
				<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
				{description && <FieldLabel>{description}</FieldLabel>}
			</FieldContent>
			<ToggleGroup
				id={field.name}
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
			<FieldError>{field.state.meta.errorMap.onDynamic?.[0]?.message}</FieldError>
		</Field>
	);
}

type ChecklistFieldItem = {
	id: string;
	label: string;
	description?: string;
	checked: boolean;
};

function ChecklistField({ placeholder }: { placeholder?: string }) {
	const field = useFieldContext<ChecklistFieldItem[]>();
	const [newItemLabel, setNewItemLabel] = useState("");

	function addItem() {
		const label = newItemLabel.trim();
		if (!label) return;
		field.handleChange([...field.state.value, { id: crypto.randomUUID(), label, checked: false }]);
		setNewItemLabel("");
	}

	return (
		<FieldGroup>
			{field.state.value.map((item) => (
				<Field key={item.id} orientation="responsive">
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
						<FieldLabel htmlFor={field.name}>{item.label}</FieldLabel>
						{item.description && <FieldLabel>{item.description}</FieldLabel>}
					</FieldContent>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label={`Remove ${item.label}`}
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
					value={newItemLabel}
					placeholder={placeholder ?? "Add item…"}
					onChange={(event) => setNewItemLabel(event.target.value)}
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
		</FieldGroup>
	);
}

function FormError({ children }: { children?: ReactNode }) {
	if (!children) return null;

	return (
		<Alert variant="destructive">
			<CircleAlertIcon />
			<AlertDescription>{children}</AlertDescription>
		</Alert>
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
	formComponents: { SubmitButton, FormError },
});
