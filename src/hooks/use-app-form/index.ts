import { createFormHook } from "@tanstack/react-form";
import { fieldContext, formContext } from "./context";
import { FormError } from "./FormError";
import { ChecklistField } from "./fields/ChecklistField";
import { ColorField } from "./fields/ColorField";
import { DateField } from "./fields/DateField";
import { InputField } from "./fields/InputField";
import { MultiToggleField } from "./fields/MultiToggleField";
import { PasswordField } from "./fields/PasswordField";
import { SelectField } from "./fields/SelectField";
import { SliderField } from "./fields/SliderField";
import { SwatchField } from "./fields/SwatchField";
import { SwitchField } from "./fields/SwitchField";
import { TextareaField } from "./fields/TextareaField";
import { ToggleGroupField } from "./fields/ToggleGroupField";
import { Section } from "./Section";
import { SubmitButton } from "./SubmitButton";
import { SubmitForm } from "./SubmitForm";

export const { useAppForm, withForm } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: {
		InputField,
		PasswordField,
		SelectField,
		SliderField,
		TextareaField,
		ToggleGroupField,
		MultiToggleField,
		ColorField,
		DateField,
		SwitchField,
		SwatchField,
		ChecklistField,
	},
	formComponents: { SubmitButton, FormError, Section, SubmitForm },
});
