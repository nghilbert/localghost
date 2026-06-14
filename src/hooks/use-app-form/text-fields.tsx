import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";
import { Input } from "#/components/ui/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "#/components/ui/input-group";
import { Textarea } from "#/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { FieldShell } from "./FieldShell";
import type { ComponentFieldProps } from "./types";

export function InputField({ label, description, ...props }: ComponentFieldProps<typeof Input>) {
	return (
		<FieldShell<string> label={label} description={description}>
			{({ field, isInvalid }) => (
				<Input
					id={field.name}
					value={field.state.value}
					onBlur={field.handleBlur}
					onChange={(event) => field.handleChange(event.target.value)}
					aria-invalid={isInvalid}
					{...props}
				/>
			)}
		</FieldShell>
	);
}

export function PasswordField({
	label,
	description,
	...props
}: Omit<ComponentFieldProps<typeof InputGroupInput>, "type">) {
	const [show, setShow] = useState(false);

	return (
		<FieldShell<string> label={label} description={description}>
			{({ field, isInvalid }) => (
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
			)}
		</FieldShell>
	);
}

export function TextareaField({
	label,
	description,
	...props
}: ComponentFieldProps<typeof Textarea>) {
	return (
		<FieldShell<string> label={label} description={description}>
			{({ field, isInvalid }) => (
				<Textarea
					id={field.name}
					value={field.state.value}
					onBlur={field.handleBlur}
					onChange={(event) => field.handleChange(event.target.value)}
					aria-invalid={isInvalid}
					{...props}
				/>
			)}
		</FieldShell>
	);
}
