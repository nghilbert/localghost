import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "#/components/ui/card";
import { accountQueries } from "#/features/account/account.queries";
import { SignInForm } from "#/features/account/components/SignInForm";

export const Route = createFileRoute("/_public/sign-in")({
	loader: ({ context }) => context.queryClient.query(accountQueries.signUpAvailability()),
	component: SignInPage,
});

function SignInPage() {
	const { data: signUp } = useSuspenseQuery(accountQueries.signUpAvailability());

	return (
		<Card.Root>
			<Card.Header>
				<Card.Title>Welcome back</Card.Title>
				<Card.Description>Sign in to your account to continue.</Card.Description>
			</Card.Header>
			<Card.Content>
				<SignInForm />
			</Card.Content>
			{signUp.open && (
				<Card.Footer className="justify-center gap-1 text-muted-fg">
					No account?
					<Link to="/sign-up" className="font-medium text-fg underline underline-offset-4">
						Create one
					</Link>
				</Card.Footer>
			)}
		</Card.Root>
	);
}
