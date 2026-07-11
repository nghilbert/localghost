import { type ErrorComponentProps, useRouter } from "@tanstack/react-router";
import { Button } from "#/shared/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "#/shared/ui/empty";

/** Router-wide error boundary: renders at the failing match, inside the app shell. */
export function RouteErrorScreen({ error, reset }: ErrorComponentProps) {
	const router = useRouter();

	return (
		<Empty className="h-full">
			<EmptyHeader>
				<EmptyTitle>Something went wrong</EmptyTitle>
				<EmptyDescription>{error.message}</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button
					variant="outline"
					onClick={() => {
						reset();
						router.invalidate();
					}}
				>
					Try again
				</Button>
			</EmptyContent>
		</Empty>
	);
}
