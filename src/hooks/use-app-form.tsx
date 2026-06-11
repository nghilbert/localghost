import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { type ComponentProps, type ElementType, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { Field, FieldError, FieldLabel } from "#/components/ui/field";
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
import { Textarea } from "#/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";

type FieldProps<TProps extends ElementType> = {
	label: string;
} & Omit<ComponentProps<TProps>, "id" | "value" | "onChange" | "onBlur">;

const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts();

function InputField({ label, ...props }: FieldProps<typeof Input>) {
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

function TextareaField({ label, ...props }: FieldProps<typeof Textarea>) {
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
			<FieldError>{field.state.meta.errorMap.onDynamic?.[0]?.message}</FieldError>
		</Field>
	);
}

type SelectFieldProps = {
	label: string;
	options: { value: string; label: string }[];
	placeholder?: string;
};

function SelectField({ label, options, placeholder }: SelectFieldProps) {
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

function SubmitButton({ children, ...props }: ComponentProps<typeof Button>) {
	const { Subscribe } = useFormContext();

	return (
		<Subscribe selector={(state) => state.isSubmitting}>
			{(isSubmitting) => (
				<Button type="submit" className="w-full" disabled={isSubmitting} {...props}>
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
	},
	formComponents: { SubmitButton },
});
