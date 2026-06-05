import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { SignUpForm } from "#/features/auth/components/SignUpForm";

export const Route = createFileRoute("/_public/sign-up")({ component: SignUpCard });

function SignUpCard() {
	return (
		<Card className="w-full max-w-sm">
			<CardHeader>
				<CardTitle>Create an account</CardTitle>
				<CardDescription>Enter your details to get started.</CardDescription>
			</CardHeader>

			<CardContent>
				<SignUpForm />
			</CardContent>

			<CardFooter className="justify-center text-sm text-muted-foreground">
				Already have an account?{" "}
				<Link to="/sign-in" className="ml-1 text-foreground underline underline-offset-4">
					Sign in
				</Link>
			</CardFooter>
		</Card>
	);
}
