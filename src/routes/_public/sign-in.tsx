import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "#/components/ui/card";
import { SignInForm } from "#/features/account/components/SignInForm";

export const Route = createFileRoute("/_public/sign-in")({
	component: SignInPage,
});

function SignInPage() {
	return (
		<Card.Root>
			<Card.Header>
				<Card.Title>Welcome back</Card.Title>
				<Card.Description>Sign in to your account to continue.</Card.Description>
			</Card.Header>
			<Card.Content>
				<SignInForm />
			</Card.Content>
			<Card.Footer className="justify-center gap-1 text-muted-fg">
				No account?
				<Link to="/sign-up" className="font-medium text-fg underline underline-offset-4">
					Create one
				</Link>
			</Card.Footer>
		</Card.Root>
	);
}
