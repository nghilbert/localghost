import { createFormHook, createFormHookContexts, revalidateLogic } from "@tanstack/react-form";
import { FormError } from "./FormError";
import { ComboboxField } from "./fields/ComboboxField";
import { CustomField } from "./fields/CustomField";
import { InputField } from "./fields/InputField";
import { NumberField } from "./fields/NumberField";
import { PasswordField } from "./fields/PasswordField";
import { SelectField } from "./fields/SelectField";
import { SliderField } from "./fields/SliderField";
import { TextareaField } from "./fields/TextareaField";
import { ToggleGroupField } from "./fields/ToggleGroupField";
import { Section } from "./Section";
import { SubmitButton } from "./SubmitButton";
import { SubmitForm } from "./SubmitForm";

export const { fieldContext, formContext, useFieldContext, useFormContext } =
	createFormHookContexts();

const { useAppForm: baseAppForm } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: {
		ComboboxField,
		CustomField,
		InputField,
		NumberField,
		PasswordField,
		SelectField,
		SliderField,
		TextareaField,
		ToggleGroupField,
	},
	formComponents: { SubmitButton, FormError, Section, SubmitForm },
});

/**
 * Defaulted to `revalidateLogic()`, without which a `validators.onDynamic` schema never
 * runs and invalid values reach the server, whose Zod error surfaces as a toast instead
 * of inline field errors. Pass `validationLogic` to override.
 */
export const useAppForm: typeof baseAppForm = (props) =>
	baseAppForm({ validationLogic: revalidateLogic(), ...props });
