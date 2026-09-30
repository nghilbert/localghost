import { type ErrorComponentProps, useRouter } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { Empty } from "#/components/ui/empty";

/** The router's error screen, shown in place of the route that failed, inside the app shell. */
export function RouteErrorScreen({ error, reset }: ErrorComponentProps) {
	const router = useRouter();

	return (
		<Empty.Root>
			<Empty.Title render={(props) => <h1 {...props} />}>Something went wrong</Empty.Title>
			<Empty.Description>
				{error instanceof Error ? error.message : "Unknown error"}
			</Empty.Description>
			<Empty.Actions>
				<Button
					variant="outlined"
					onClick={() => {
						reset();
						router.invalidate();
					}}
				>
					Try again
				</Button>
			</Empty.Actions>
		</Empty.Root>
	);
}
