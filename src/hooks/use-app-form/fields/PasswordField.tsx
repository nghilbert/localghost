import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "#/components/ui/input-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { useFieldContext } from "../context";
import { FieldShell } from "./FieldShell";
import type { ComponentFieldProps } from "./types";

export function PasswordField({
	label,
	description,
	orientation,
	...props
}: Omit<ComponentFieldProps<typeof InputGroupInput>, "type">) {
	const field = useFieldContext<string>();
	const [show, setShow] = useState(false);

	return (
		<FieldShell label={label} description={description} orientation={orientation}>
			<InputGroup>
				<InputGroupInput
					id={field.name}
					value={field.state.value}
					onBlur={field.handleBlur}
					onChange={(event) => field.handleChange(event.target.value)}
					aria-invalid={!field.state.meta.isValid}
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
		</FieldShell>
	);
}
