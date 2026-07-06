import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import { FormError } from "./FormError";
import { InputField } from "./fields/InputField";
import { NumberField } from "./fields/NumberField";
import { PasswordField } from "./fields/PasswordField";
import { SliderField } from "./fields/SliderField";
import { TextareaField } from "./fields/TextareaField";
import { ToggleGroupField } from "./fields/ToggleGroupField";
import { Section } from "./Section";
import { SubmitButton } from "./SubmitButton";
import { SubmitForm } from "./SubmitForm";

export const { fieldContext, formContext, useFieldContext, useFormContext } =
	createFormHookContexts();

export const { useAppForm, withForm } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: {
		InputField,
		NumberField,
		PasswordField,
		SliderField,
		TextareaField,
		ToggleGroupField,
	},
	formComponents: { SubmitButton, FormError, Section, SubmitForm },
});
