import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { SignInForm } from "#/features/auth/components/SignInForm";

export const Route = createFileRoute("/_public/sign-in")({ component: SignInCard });

function SignInCard() {
	return (
		<Card className="w-full max-w-sm">
			<CardHeader>
				<CardTitle>Sign in</CardTitle>
				<CardDescription>Enter your email and password to continue.</CardDescription>
			</CardHeader>

			<CardContent>
				<SignInForm />
			</CardContent>

			<CardFooter className="justify-center text-sm text-muted-foreground">
				No account?{" "}
				<Link to="/sign-up" className="ml-1 text-foreground underline underline-offset-4">
					Create one
				</Link>
			</CardFooter>
		</Card>
	);
}
