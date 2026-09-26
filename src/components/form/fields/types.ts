import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ElementType } from "react";
import type { Field } from "#/components/ui/field";

/** Props every field component takes. */
export type BaseFieldProps = {
	label: string;
	description?: string;
	fieldOrientation?: ComponentProps<typeof Field.Root>["orientation"];
};

/** One choice in a select, radio, or toggle group field. */
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

/** A control's own props plus the base field props, minus what the form sets. */
export type ComponentFieldProps<T extends ElementType> = BaseFieldProps & OmitManagedProps<T>;
