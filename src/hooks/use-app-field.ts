import { useFieldContext } from "#/hooks/app-form-context";

export function useAppField<TValue>() {
	const field = useFieldContext<TValue>();
	// Fields that haven't been touched yet are valid. Otherwise use the field's isValid state
	const isFieldValid = !field.state.meta.isTouched ? true : field.state.meta.isValid;

	return { field, isFieldValid };
}
