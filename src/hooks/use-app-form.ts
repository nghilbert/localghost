import { createFormHook } from "@tanstack/react-form";
import { ChecklistField } from "#/components/appForm/ChecklistField";
import { ColorField } from "#/components/appForm/ColorField";
import { DateField } from "#/components/appForm/DateField";
import { FormError } from "#/components/appForm/FormError";
import { InputField } from "#/components/appForm/InputField";
import { MultiToggleField } from "#/components/appForm/MultiToggleField";
import { PasswordField } from "#/components/appForm/PasswordField";
import { SelectField } from "#/components/appForm/SelectField";
import { Shell } from "#/components/appForm/Shell";
import { SubmitButton } from "#/components/appForm/SubmitButton";
import { SwatchField } from "#/components/appForm/SwatchField";
import { SwitchField } from "#/components/appForm/SwitchField";
import { TextareaField } from "#/components/appForm/TextareaField";
import { ToggleGroupField } from "#/components/appForm/ToggleGroupField";
import { fieldContext, formContext } from "#/hooks/app-form-context";

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
		DateField,
		SwitchField,
		SwatchField,
		ChecklistField,
	},
	formComponents: { SubmitButton, FormError, Shell },
});
