import { Link } from "@tanstack/react-router";
import { ButtonLink, type ButtonLinkProps } from "#/components/ui/button-link";

/** The element id of the llama.cpp settings section, which this link scrolls to. */
export const LLAMACPP_SETTINGS_ID = "llamacpp";

/** A link to the llama.cpp settings in Settings > Endpoints, drawn as a button. */
export function LlamacppSettingsLink(props: Omit<ButtonLinkProps, "render">) {
	return (
		<ButtonLink render={<Link to="/settings/endpoints" hash={LLAMACPP_SETTINGS_ID} />} {...props} />
	);
}
