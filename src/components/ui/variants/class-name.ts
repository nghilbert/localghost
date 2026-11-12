import { cn, type ClassValue } from "tailwind-variants";

/**
 * What Base UI accepts for `className`: a string, or a function of the part's state.
 */
export type BaseClassName<State> = string | ((state: State) => string | undefined) | undefined;

/**
 * Merges a caller's `className` into a component's own, putting theirs last so
 * it wins any conflict.
 *
 * Handles the case where `className` is a function of state, which cannot be
 * passed straight to a class set. Returns a function if given one, a string
 * otherwise; Base UI accepts either.
 *
 * ```tsx
 * className={mergeClassName(className, (extra) => controlVariants({ size, class: extra }))}
 * ```
 */
export function mergeClassName<State>(
	className: BaseClassName<State>,
	build: (extra: ClassValue) => ClassValue,
): string | ((state: State) => string) {
	if (typeof className === "function") return (state) => cn(build(className(state)));
	return cn(build(className));
}
