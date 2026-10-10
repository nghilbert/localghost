import { createFormHook, revalidateLogic } from "@tanstack/react-form";
import { CheckboxField } from "./fields/CheckboxField";
import { ComboboxField } from "./fields/ComboboxField";
import { CustomField } from "./fields/CustomField";
import { InputField } from "./fields/InputField";
import { NumberField } from "./fields/NumberField";
import { PasswordField } from "./fields/PasswordField";
import { RadioGroupField } from "./fields/RadioGroupField";
import { SelectField } from "./fields/SelectField";
import { SliderField } from "./fields/SliderField";
import { SwitchField } from "./fields/SwitchField";
import { TextareaField } from "./fields/TextareaField";
import { ToggleGroupField } from "./fields/ToggleGroupField";
import { Form } from "./Form";
import { fieldContext, formContext } from "./form-context";
import { FormError } from "./FormError";
import { SubmitButton } from "./SubmitButton";

const {
	useAppForm: useBaseAppForm,
	withForm,
	withFieldGroup,
} = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: {
		CheckboxField,
		ComboboxField,
		CustomField,
		InputField,
		NumberField,
		PasswordField,
		RadioGroupField,
		SelectField,
		SliderField,
		SwitchField,
		TextareaField,
		ToggleGroupField,
	},
	formComponents: { Form, FormError, SubmitButton },
});

/**
 * TanStack Form's `useAppForm` with this kit's fields. Defaults `validationLogic` to
 * `revalidateLogic()`, which `validators.onDynamic` needs in order to run.
 */
export const useAppForm: typeof useBaseAppForm = (props) =>
	useBaseAppForm({ validationLogic: revalidateLogic(), ...props });

export { withFieldGroup, withForm };
