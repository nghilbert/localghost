import { createFormHook } from "@tanstack/react-form";
import { MultiToggleField, SelectField, SwatchField, ToggleGroupField } from "./choice-fields";
import { fieldContext, formContext } from "./context";
import { FormError, SubmitButton } from "./form-components";
import { ChecklistField, ColorField, SwitchField } from "./special-fields";
import { InputField, PasswordField, TextareaField } from "./text-fields";

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
