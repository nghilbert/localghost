import { type AnyFieldApi, createFormHookContexts } from "@tanstack/react-form";

export const { fieldContext, formContext, useFieldContext, useFormContext } =
	createFormHookContexts();

export function isFieldInvalid(field: AnyFieldApi) {
	return field.state.meta.isTouched && !field.state.meta.isValid;
}
