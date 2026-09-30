import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";
import { InputGroup } from "#/components/ui/input-group";
import { Tooltip } from "#/components/ui/tooltip";
import { useFieldBinding } from "../use-field-binding";
import { FieldShell } from "./FieldShell";
import type { ComponentFieldProps } from "./types";

/** A masked text field with a button at its end that shows or hides what was typed. */
export function PasswordField({
	label,
	description,
	fieldOrientation,
	...props
}: Omit<ComponentFieldProps<typeof InputGroup.Input>, "type">) {
	const { field } = useFieldBinding<string>();
	const [visible, setVisible] = useState(false);
	const toggleLabel = visible ? "Hide password" : "Show password";

	return (
		<FieldShell label={label} description={description} orientation={fieldOrientation}>
			<InputGroup.Root>
				<InputGroup.Input
					value={field.state.value}
					onBlur={field.handleBlur}
					onValueChange={field.handleChange}
					{...props}
					type={visible ? "text" : "password"}
				/>
				<InputGroup.Addon align="inline-end">
					<Tooltip.Root>
						<Tooltip.Trigger
							render={
								<InputGroup.Button
									color="neutral"
									iconOnly
									aria-label={toggleLabel}
									onClick={() => setVisible((value) => !value)}
								/>
							}
						>
							{visible ? <EyeOffIcon /> : <EyeIcon />}
						</Tooltip.Trigger>
						<Tooltip.Content>{toggleLabel}</Tooltip.Content>
					</Tooltip.Root>
				</InputGroup.Addon>
			</InputGroup.Root>
		</FieldShell>
	);
}
