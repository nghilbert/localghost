import { Link } from "@tanstack/react-router";
import { ButtonLink } from "#/components/ui/button-link";
import { Empty } from "#/components/ui/empty";

/** The page shown for an unknown URL. */
export function NotFoundScreen() {
	return (
		<Empty.Root>
			<Empty.Title render={(props) => <h1 {...props} />}>404: Not found</Empty.Title>
			<Empty.Description>The page you're looking for does not exist.</Empty.Description>
			<Empty.Actions>
				<ButtonLink variant="quiet" render={<Link to="/" />}>
					Go home
				</ButtonLink>
			</Empty.Actions>
		</Empty.Root>
	);
}
