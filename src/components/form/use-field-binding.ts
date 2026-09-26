import type { AnyFieldApi } from "@tanstack/react-form";
import { useFieldContext } from "./form-context";

/** The active field, plus the props and errors every field control needs. */
export function useFieldBinding<T>() {
	const field = useFieldContext<T>();
	const meta = field.state.meta;

	return {
		field,
		rootProps: { invalid: !meta.isValid, touched: meta.isTouched, dirty: meta.isDirty },
		errors: meta.errors,
	};
}

/** Marks the field touched when a Select or Combobox closes. Pass as `onOpenChange`. */
export function closeAsBlur(field: AnyFieldApi) {
	return (open: boolean) => {
		if (!open) field.handleBlur();
	};
}
