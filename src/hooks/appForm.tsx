import { createFormHook, createFormHookContexts, useStore } from "@tanstack/react-form";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { type ComponentProps, type ElementType, useState } from "react";
import { Button } from "#/components/ui/button";
import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "#/components/ui/input-group";
import { Spinner } from "#/components/ui/spinner";
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

function SubmitButton({ children, ...props }: ComponentProps<typeof Button>) {
	const { store } = useFormContext();
	const isSubmitting = useStore(store, (state) => state.isSubmitting);

	return (
		<Button type="submit" className="w-full" disabled={isSubmitting} {...props}>
			{isSubmitting && <Spinner data-icon="inline-start" />}
			{children}
		</Button>
	);
}

export const { useAppForm, withForm } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: { InputField, PasswordField },
	formComponents: { SubmitButton },
});
