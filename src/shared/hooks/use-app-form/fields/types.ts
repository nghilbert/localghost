import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ElementType } from "react";
import type { Field } from "#/shared/ui/field";

export type BaseFieldProps = {
	label: string;
	description?: string;
	fieldOrientation?: ComponentProps<typeof Field>["orientation"];
};
export type FieldOption = { label: string; value: string; icon?: LucideIcon };

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
