import { createFormHookContexts } from "@tanstack/react-form";

/**
 * Split out so fields can `useFieldContext` without importing `use-app-form.ts`,
 * which would create a circular import (fields to hook to fields).
 */
export const { fieldContext, formContext, useFieldContext, useFormContext } =
	createFormHookContexts();
