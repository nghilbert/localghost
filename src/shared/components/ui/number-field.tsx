import { NumberField as NumberFieldPrimitive } from "@base-ui/react/number-field";
import { createContext, use } from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "#/shared/lib/utils";

type NumberFieldSize = "sm" | "default" | "lg";

const NumberFieldSizeContext = createContext<NumberFieldSize>("default");

const numberFieldGroupVariants = tv({
	base: "relative flex w-full min-w-0 items-center justify-between rounded-lg border border-input bg-transparent transition-colors outline-none focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20 data-disabled:pointer-events-none data-disabled:opacity-50 dark:bg-input/30 dark:has-aria-invalid:border-destructive/50 dark:has-aria-invalid:ring-destructive/40",
	variants: {
		size: {
			sm: "h-7 text-sm",
			default: "h-8 text-sm",
			lg: "h-9 text-sm",
		},
	},
	defaultVariants: { size: "default" },
});

const numberFieldButtonVariants = tv({
	base: "relative flex shrink-0 items-center justify-center text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50 pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11",
	variants: {
		size: {
			sm: "px-1.5 [&_svg:not([class*='size-'])]:size-3.5",
			default: "px-2 [&_svg:not([class*='size-'])]:size-4",
			lg: "px-2.5 [&_svg:not([class*='size-'])]:size-4",
		},
	},
	defaultVariants: { size: "default" },
});

const numberFieldInputVariants = tv({
	base: "h-full w-full min-w-0 flex-1 bg-transparent text-center tabular-nums outline-none placeholder:text-muted-foreground",
	variants: {
		size: {
			sm: "px-2 py-0.5",
			default: "px-2.5 py-1",
			lg: "px-2.5 py-1.5",
		},
	},
	defaultVariants: { size: "default" },
});

export function NumberField({
	className,
	size = "default",
	...props
}: NumberFieldPrimitive.Root.Props & VariantProps<typeof numberFieldGroupVariants>) {
	const sizeValue = size ?? "default";
	return (
		<NumberFieldSizeContext.Provider value={sizeValue}>
			<NumberFieldPrimitive.Root
				data-slot="number-field"
				data-size={sizeValue}
				className={cn("flex w-full flex-col gap-2", className)}
				{...props}
			/>
		</NumberFieldSizeContext.Provider>
	);
}

export function NumberFieldGroup({
	className,
	size,
	...props
}: NumberFieldPrimitive.Group.Props & Partial<VariantProps<typeof numberFieldGroupVariants>>) {
	const contextSize = use(NumberFieldSizeContext);
	return (
		<NumberFieldPrimitive.Group
			data-slot="number-field-group"
			className={cn(numberFieldGroupVariants({ size: size ?? contextSize }), className)}
			{...props}
		/>
	);
}

export function NumberFieldInput({
	className,
	size,
	...props
}: NumberFieldPrimitive.Input.Props & Partial<VariantProps<typeof numberFieldInputVariants>>) {
	const contextSize = use(NumberFieldSizeContext);
	return (
		<NumberFieldPrimitive.Input
			data-slot="number-field-input"
			className={cn(numberFieldInputVariants({ size: size ?? contextSize }), className)}
			{...props}
		/>
	);
}

export function NumberFieldDecrement({
	className,
	size,
	...props
}: NumberFieldPrimitive.Decrement.Props & Partial<VariantProps<typeof numberFieldButtonVariants>>) {
	const contextSize = use(NumberFieldSizeContext);
	return (
		<NumberFieldPrimitive.Decrement
			data-slot="number-field-decrement"
			className={cn(
				numberFieldButtonVariants({ size: size ?? contextSize }),
				"rounded-s-lg border-e border-input",
				className,
			)}
			{...props}
		/>
	);
}

export function NumberFieldIncrement({
	className,
	size,
	...props
}: NumberFieldPrimitive.Increment.Props & Partial<VariantProps<typeof numberFieldButtonVariants>>) {
	const contextSize = use(NumberFieldSizeContext);
	return (
		<NumberFieldPrimitive.Increment
			data-slot="number-field-increment"
			className={cn(
				numberFieldButtonVariants({ size: size ?? contextSize }),
				"rounded-e-lg border-s border-input",
				className,
			)}
			{...props}
		/>
	);
}

export function NumberFieldScrubArea({
	className,
	...props
}: NumberFieldPrimitive.ScrubArea.Props) {
	return (
		<NumberFieldPrimitive.ScrubArea
			data-slot="number-field-scrub-area"
			className={cn("cursor-ew-resize select-none", className)}
			{...props}
		/>
	);
}

export function NumberFieldScrubAreaCursor({
	className,
	...props
}: NumberFieldPrimitive.ScrubAreaCursor.Props) {
	return (
		<NumberFieldPrimitive.ScrubAreaCursor
			data-slot="number-field-scrub-area-cursor"
			className={cn("drop-shadow-[0_1px_1px_#0008]", className)}
			{...props}
		>
			<CursorGrowIcon />
		</NumberFieldPrimitive.ScrubAreaCursor>
	);
}

function CursorGrowIcon() {
	return (
		<svg
			aria-hidden="true"
			width="26"
			height="14"
			viewBox="0 0 24 14"
			fill="black"
			stroke="white"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path d="M19.5 5.5L6.49737 5.51844V2L1 6.9999L6.5 12L6.49737 8.5L19.5 8.5V12L25 6.9999L19.5 2V5.5Z" />
		</svg>
	);
}
