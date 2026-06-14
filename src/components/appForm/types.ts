import type { ComponentProps, ElementType } from "react";

export type FieldOrientation = "vertical" | "horizontal" | "responsive";

export type BaseFieldProps = {
	label: string;
	description?: string;
	orientation?: FieldOrientation;
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
