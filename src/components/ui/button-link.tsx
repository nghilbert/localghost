import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { type ActionVariants, actionVariants } from "#/components/ui/variants/action";

/** Props for {@link ButtonLink}. */
export type ButtonLinkProps = useRender.ComponentProps<"a"> & ActionVariants;

/**
 * A link drawn as a button. It renders an `<a>`, since Base UI's Button gives any element
 * `role="button"`. For client-side routing pass the router's Link:
 * `<ButtonLink render={<Link to="/settings" />}>Settings</ButtonLink>`.
 */
export function ButtonLink({
	render,
	className,
	color,
	variant,
	size,
	iconOnly,
	...props
}: ButtonLinkProps) {
	return useRender({
		defaultTagName: "a",
		render,
		props: mergeProps<"a">(
			{ className: actionVariants({ color, variant, size, iconOnly, class: className }) },
			props,
		),
	});
}
