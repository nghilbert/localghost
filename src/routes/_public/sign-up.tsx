import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "#/components/ui/card";
import { SignUpForm } from "#/features/account/components/SignUpForm";

export const Route = createFileRoute("/_public/sign-up")({
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
