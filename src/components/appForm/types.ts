import type { ComponentProps, ElementType } from "react";
import type { Field } from "#/components/ui/field";

export type BaseFieldProps = {
	label: string;
	description?: string;
	orientation?: ComponentProps<typeof Field>["orientation"];
};
export type FieldOption = { label: string; value: string };

type FormManagedPropKeys =
	| "id"
	| "value"
	| "onChange"
	| "onBlur"
	| "onValueChange"
	| "checked"
	| "onCheckedChange"
	| "defaultValue";
type OmitManagedProps<T extends ElementType> = Omit<ComponentProps<T>, FormManagedPropKeys>;

export type ComponentFieldProps<T extends ElementType> = BaseFieldProps & OmitManagedProps<T>;
