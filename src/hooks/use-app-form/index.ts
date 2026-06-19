import { createFormHook } from "@tanstack/react-form";
import { fieldContext, formContext } from "./context";
import { FormError } from "./FormError";
import { InputField } from "./fields/InputField";
import { PasswordField } from "./fields/PasswordField";
import { SliderField } from "./fields/SliderField";
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
		SliderField,
		TextareaField,
		ToggleGroupField,
	},
	formComponents: { SubmitButton, FormError, Section, SubmitForm },
});
