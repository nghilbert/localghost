import { createFieldMap } from "@tanstack/react-form";
import { withFieldGroup } from "../use-app-form";

/**
 * Maps this group's field names onto a parent form's top-level fields of the same
 * name. Pass as `fields={passwordConfirmFields}` wherever the parent form has
 * `password` and `confirmPassword` fields directly (sign-up, change password).
 */
export const passwordConfirmFields = createFieldMap({ password: "", confirmPassword: "" });

/** A password field plus its confirmation, shared by sign-up and the change-password form. */
export const PasswordConfirmGroup = withFieldGroup({
	defaultValues: { password: "", confirmPassword: "" },
	render: function Render({ group }) {
		return (
			<>
				<group.AppField name="password">
					{(field) => <field.PasswordField label="Password" autoComplete="new-password" />}
				</group.AppField>
				<group.AppField name="confirmPassword">
					{(field) => <field.PasswordField label="Confirm password" autoComplete="new-password" />}
				</group.AppField>
			</>
		);
	},
});
