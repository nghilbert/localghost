import { Field as FieldPrimitive } from "@base-ui/react/field";
import { Fieldset as FieldsetPrimitive } from "@base-ui/react/fieldset";
import type { ComponentProps, ReactNode } from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { Separator } from "#/shared/components/ui/separator";
import { cn } from "#/shared/lib/utils";

export function FieldSet({ className, ...props }: FieldsetPrimitive.Root.Props) {
	return (
		<FieldsetPrimitive.Root
			data-slot="field-set"
			className={cn(
				"flex flex-col gap-4 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3",
				className,
			)}
			{...props}
		/>
	);
}

export function FieldLegend({
	className,
	variant = "legend",
	...props
}: FieldsetPrimitive.Legend.Props & { variant?: "legend" | "label" }) {
	return (
		<FieldsetPrimitive.Legend
			data-slot="field-legend"
			data-variant={variant}
			className={cn(
				"mb-1.5 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base",
				className,
			)}
			{...props}
		/>
	);
}

export function FieldGroup({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			data-slot="field-group"
			className={cn(
				"group/field-group @container/field-group flex w-full flex-col gap-5 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4",
				className,
			)}
			{...props}
		/>
	);
}

const fieldVariants = tv({
	base: "group/field flex w-full gap-2 data-invalid:text-destructive",
	variants: {
		orientation: {
			vertical: "flex-col *:w-full [&>.sr-only]:w-auto",
			horizontal:
				"flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
			responsive:
				"flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
		},
	},
	defaultVariants: {
		orientation: "vertical",
	},
});

export function Field({
	className,
	orientation = "vertical",
	...props
}: FieldPrimitive.Root.Props & VariantProps<typeof fieldVariants>) {
	return (
		<FieldPrimitive.Root
			data-slot="field"
			data-orientation={orientation}
			className={cn(fieldVariants({ orientation }), className)}
			{...props}
		/>
	);
}

export function FieldContent({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			data-slot="field-content"
			className={cn("group/field-content flex flex-1 flex-col gap-0.5 leading-snug", className)}
			{...props}
		/>
	);
}

export function FieldLabel({ className, ...props }: FieldPrimitive.Label.Props) {
	return (
		<FieldPrimitive.Label
			data-slot="field-label"
			className={cn(
				"group/field-label peer/field-label flex w-fit items-center gap-2 leading-snug select-none group-data-disabled/field:opacity-50 has-data-checked:border-primary/30 has-data-checked:bg-primary/5 has-[>[data-slot=field]]:rounded-lg has-[>[data-slot=field]]:border *:data-[slot=field]:p-2.5 dark:has-data-checked:border-primary/20 dark:has-data-checked:bg-primary/10",
				"has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col",
				className,
			)}
			{...props}
		/>
	);
}

export function FieldControl({ ...props }: FieldPrimitive.Control.Props) {
	return <FieldPrimitive.Control data-slot="field-control" {...props} />;
}

export function FieldTitle({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			data-slot="field-label"
			className={cn(
				"flex w-fit items-center gap-2 text-sm font-medium group-data-disabled/field:opacity-50",
				className,
			)}
			{...props}
		/>
	);
}

export function FieldDescription({ className, ...props }: FieldPrimitive.Description.Props) {
	return (
		<FieldPrimitive.Description
			data-slot="field-description"
			className={cn(
				"text-left text-sm leading-normal font-normal text-muted-foreground group-has-data-horizontal/field:text-balance [[data-variant=legend]+&]:-mt-1.5",
				"last:mt-0 nth-last-2:-mt-1",
				"[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
				className,
			)}
			{...props}
		/>
	);
}

export function FieldSeparator({
	children,
	className,
	...props
}: ComponentProps<"div"> & { children?: ReactNode }) {
	return (
		<div
			data-slot="field-separator"
			data-content={!!children}
			className={cn(
				"relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2",
				className,
			)}
			{...props}
		>
			<Separator className="absolute inset-0 top-1/2" />
			{children && (
				<span
					className="relative mx-auto block w-fit bg-background px-2 text-muted-foreground"
					data-slot="field-separator-content"
				>
					{children}
				</span>
			)}
		</div>
	);
}

function resolveFieldErrorContent({
	children,
	errors,
}: {
	children?: ReactNode;
	errors?: Array<{ message?: string } | undefined>;
}): ReactNode {
	if (children) {
		return children;
	}

	const errorMessages = [
		...new Set(
			errors?.map((error) => error?.message).filter((message): message is string => !!message),
		),
	];

	if (errorMessages.length === 0) return null;
	if (errorMessages.length === 1) return errorMessages[0];

	return (
		<ul className="ml-4 flex list-disc flex-col gap-1">
			{errorMessages.map((message) => (
				<li key={message}>{message}</li>
			))}
		</ul>
	);
}

export function FieldError({
	className,
	children,
	errors,
	match = true,
	...props
}: FieldPrimitive.Error.Props & { errors?: Array<{ message?: string } | undefined> }) {
	const content = resolveFieldErrorContent({ children, errors });

	if (!content) return null;

	return (
		<FieldPrimitive.Error
			role="alert"
			data-slot="field-error"
			match={match}
			className={cn("text-sm font-normal text-destructive", className)}
			{...props}
		>
			{content}
		</FieldPrimitive.Error>
	);
}
