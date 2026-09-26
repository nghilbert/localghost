import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Card } from "#/components/ui/card";
import { accountQueries } from "#/features/account/account.queries";
import { SignUpForm } from "#/features/account/components/SignUpForm";

export const Route = createFileRoute("/_public/sign-up")({
	// Only one account can exist, so skip the form once it does.
	beforeLoad: async ({ context }) => {
		const { open } = await context.queryClient.query(accountQueries.signUpAvailability());
		if (!open) throw redirect({ to: "/sign-in" });
	},
	component: SignUpPage,
});

function SignUpPage() {
	return (
		<Card.Root>
			<Card.Header>
				<Card.Title>Create an account</Card.Title>
				<Card.Description>Enter your details to get started.</Card.Description>
			</Card.Header>
			<Card.Content>
				<SignUpForm />
			</Card.Content>
			<Card.Footer className="justify-center gap-1 text-muted-fg">
				Already have an account?
				<Link to="/sign-in" className="font-medium text-fg underline underline-offset-4">
					Sign in
				</Link>
			</Card.Footer>
		</Card.Root>
	);
}
